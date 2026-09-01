import structuredClone from '@ungap/structured-clone'

import { applyEvent } from '../board/applyEvent'
import { Game } from '../board/Game'
import logger from '../logger'
import { expandActionCandidates } from '../mjai/expandCandidates'
import { decodeMajsoulWire } from '../platforms/majsoul/decode'
import { inferMeSeatFromAction, resolveMeSeatFromAuth } from '../platforms/majsoul/inferMeSeat'
import { parseReq as majsoulParseReq } from '../platforms/majsoul/parseReq'
import { actionToMjai } from '../platforms/majsoul/toMjai'
import { parseRes as tenhouParseRes } from '../platforms/tenhou'
import type { BaseAnalyser } from '../types/Analyser'
import type { GameNameString } from '../types/General'
import type { ActionCandidateList, MjaiEventList, Pai } from '../types/Mjai'
import { ActionPrototype } from '../types/ParsedMajsoulJSON'
import UI from '../UI'

function printIDerror (): void {
  UI.print('未获取玩家的ID或ID错误, 请重启游戏')
  UI.print('牌局记录创建失败, 本场游戏不会进行分析')
}

class Pipeline {
  reqQueue: Record<GameNameString, Record<number, { resName: string }>> = {
    majsoul: {},
    tenhou: {},
  }

  async handleReq (bufferMsg: Buffer, gameName: GameNameString): Promise<void> {
    if (!Object.keys(this.reqQueue).includes(gameName)) { return }
    const _rand = ~~(Math.random() * 10000)
    logger.info(`<req-handler> Begin to handle ReqMsg(${gameName}${_rand}): ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const msgList = gameName === 'majsoul' ? majsoulParseReq(bufferMsg) : []
    logger.info(`<req-handler> Parsed ReqMsg(${gameName}${_rand}) ${JSON.stringify(structuredClone(msgList))}`)
    for (let i = 0; i < msgList.length; i++) {
      const msg = msgList[i]
      const { resName, index } = msg
      this.reqQueue[gameName][index] = { resName }
    }
  }

  async handleRes (
    bufferMsg: Buffer, meID: string = '', gameName: GameNameString,
  ): Promise<void> {
    if (!Object.keys(this.reqQueue).includes(gameName)) { return }
    if (this.analyser === undefined) { return }

    const _rand = ~~(Math.random() * 10000)
    logger.info(`<res-handler> Begin to handle ResMsg(${gameName}${_rand}): ${JSON.stringify(bufferMsg.toJSON().data)}`)

    const effectiveMeID = (meID !== undefined && meID.length > 0) ? meID : this.meID
    const [mjaiEventList, actionCandidateList] = gameName === 'majsoul'
      ? this.processMajsoulRes(bufferMsg, effectiveMeID)
      : tenhouParseRes(bufferMsg)

    logger.info(`<res-handler> Parsed ResMsg(${gameName}${_rand}) meID=${this.meID ?? ''} meSeat=${this.meSeat ?? ''} awaiting=${String(this.awaitingMeSeat)} ${JSON.stringify(structuredClone(mjaiEventList))}`)

    if (mjaiEventList.length === 0) { return }

    logger.info('<res-handler> GameRecorder start')
    for (const mjaiEvent of mjaiEventList) {
      if (mjaiEvent.type === 'dahai') {
        this.lastDahai = { actor: mjaiEvent.actor, pai: mjaiEvent.pai }
      }
      if (mjaiEvent.type === 'start_kyoku') {
        this.lastDahai = undefined
      }
      if (mjaiEvent.type === 'start_game') {
        const meSeat = mjaiEvent.id
        if (meSeat === -1) {
          if (this.awaitingMeSeat) {
            UI.print('等待从牌局消息推断座位...')
            continue
          }
          return printIDerror()
        }
        this.game = new Game({ meSeat })
        this.meSeat = meSeat
        this.awaitingMeSeat = false
        this.pendingActionNewRound = undefined
        continue
      }
      if (mjaiEvent.type === 'end_game') {
        delete this.game
        this.meSeat = undefined
        this.awaitingMeSeat = false
        this.pendingActionNewRound = undefined
        continue
      }
      if (this.game === undefined) { break }
      const recordedStepNum = applyEvent(this.game, mjaiEvent)
      UI.print(`new msg... ${recordedStepNum}`, mjaiEvent)
    }
    logger.info('<res-handler> GameRecorder end')

    if (this.game?.rounds[this.game.roundPointer] === undefined) { return }
    if (this.analyser === undefined) { return }
    if (actionCandidateList.length === 0) { return }

    logger.info('<res-handler> Analyser start')
    UI.print('action candidates', actionCandidateList)
    const round = this.game.rounds[this.game.roundPointer]
    const mjaiActionList = expandActionCandidates(actionCandidateList, round)
    UI.print('analysing actions', mjaiActionList)
    const { choice: actionChoice, info } = await this.analyser.analyseActions(mjaiActionList, round)
    UI.print('choice: ', JSON.stringify(structuredClone(actionChoice)), ' | ', info)
    logger.info('<res-handler> Analyser end')
    logger.info(`<res-handler> handled ResMsg${_rand}`)
  }

  processMajsoulRes (binaryMsg: Buffer, meID?: string): [MjaiEventList, ActionCandidateList] {
    const wire = decodeMajsoulWire(binaryMsg, this.reqQueue.majsoul)
    logger.info(`<parser> parsed ResMsg Buffer to JSON(majsoul): ${JSON.stringify(structuredClone(wire))}`)
    if (wire === null) { return [[], []] }

    const parsedMsgList: MjaiEventList = []
    const actionCandidateList: ActionCandidateList = []

    if (wire.name === 'ResLogin') {
      if (wire.data.account_id !== undefined) {
        this.meID = String(wire.data.account_id)
      }
      return [parsedMsgList, actionCandidateList]
    }

    if (wire.name === 'ResAuthGame') {
      if (wire.data.error !== null && wire.data.error !== undefined) { return [parsedMsgList, actionCandidateList] }
      if (wire.data.seat_list.length < 1) { return [parsedMsgList, actionCandidateList] }
      const resolved = resolveMeSeatFromAuth(wire.data, meID)
      if (resolved.meID.length > 0) { this.meID = resolved.meID }
      if (resolved.meSeat !== -1) {
        this.meSeat = resolved.meSeat
        this.awaitingMeSeat = false
        this.pendingActionNewRound = undefined
        parsedMsgList.push({ type: 'start_game', id: resolved.meSeat })
      } else {
        this.meSeat = undefined
        this.awaitingMeSeat = true
        logger.info('<parser> ResAuthGame: meSeat unresolved (ranked?). Will infer from later actions.')
      }
    }

    if (wire.name === 'NotifyGameTerminate') {
      parsedMsgList.push({ type: 'end_game' })
      this.awaitingMeSeat = false
      this.pendingActionNewRound = undefined
    }

    if (wire.name === 'ActionPrototype') {
      this.appendMajsoulAction(wire, parsedMsgList, actionCandidateList)
    }

    if (
      wire.name === 'ResSyncGame' &&
      wire.data.game_restore !== undefined &&
      wire.data.game_restore !== null &&
      !wire.data.is_end
    ) {
      if (this.meSeat === undefined || this.meSeat === -1) {
        for (const action of wire.data.game_restore.actions) {
          const inferred = inferMeSeatFromAction({ name: 'ActionPrototype', data: action })
          if (inferred !== undefined) {
            this.meSeat = inferred
            this.awaitingMeSeat = false
            parsedMsgList.push({ type: 'start_game', id: inferred })
            break
          }
        }
      }
      if (this.meSeat === undefined || this.meSeat === -1) {
        logger.info('<parser> ResSyncGame: still cannot resolve meSeat')
        return [parsedMsgList, actionCandidateList]
      }
      for (const action of wire.data.game_restore.actions) {
        const result = actionToMjai(
          { name: 'ActionPrototype', data: action },
          this.meSeat,
          { lastDahai: this.lastDahai },
        )
        parsedMsgList.push(...result.events)
        actionCandidateList.length = 0
        actionCandidateList.push(...result.candidates)
        if (result.lastDahai !== undefined) { this.lastDahai = result.lastDahai }
      }
    }

    return [parsedMsgList, actionCandidateList]
  }

  private appendMajsoulAction (
    wire: ActionPrototype,
    parsedMsgList: MjaiEventList,
    actionCandidateList: ActionCandidateList,
  ): void {
    const known = this.meSeat !== undefined && this.meSeat !== -1
    if (!known) {
      const inferred = inferMeSeatFromAction(wire)
      if (inferred === undefined) {
        if (wire.data.name === 'ActionNewRound') {
          this.pendingActionNewRound = wire
          this.awaitingMeSeat = true
          logger.info('<parser> buffer ActionNewRound until meSeat is known')
        }
        return
      }
      this.meSeat = inferred
      this.awaitingMeSeat = false
      parsedMsgList.push({ type: 'start_game', id: inferred })
      logger.info(`<parser> inferred meSeat=${inferred} from ${wire.data.name}`)

      if (
        this.pendingActionNewRound !== undefined &&
        this.pendingActionNewRound !== wire
      ) {
        const pending = actionToMjai(this.pendingActionNewRound, inferred, { lastDahai: this.lastDahai })
        parsedMsgList.push(...pending.events)
        actionCandidateList.push(...pending.candidates)
        if (pending.lastDahai !== undefined) { this.lastDahai = pending.lastDahai }
        this.pendingActionNewRound = undefined
      }
    }

    const meSeat = this.meSeat as number
    const result = actionToMjai(wire, meSeat, { lastDahai: this.lastDahai })
    parsedMsgList.push(...result.events)
    actionCandidateList.length = 0
    actionCandidateList.push(...result.candidates)
    if (result.lastDahai !== undefined) { this.lastDahai = result.lastDahai }
  }

  game?: Game

  meID?: string

  meSeat?: number

  awaitingMeSeat = false

  pendingActionNewRound?: ActionPrototype

  lastDahai?: { actor: number, pai: Pai }

  analyser?: BaseAnalyser
  setAnalyser (analyser: BaseAnalyser): void { this.analyser = analyser }
}

export { Pipeline }
