import structuredClone from '@ungap/structured-clone'

import { analyserModule } from './analyser/analyserModule'
import { Game } from './gameRecords/Game'
import { record } from './gameRecords/record'
import logger from './logger'
import { parseReqBufferMsg as MajsoulParseReqBufferMsg } from './majsoul/parseReqBufferMsg'
import { parseResBufferMsg as MajsoulParseResBufferMsg } from './majsoul/parseResBufferMsg'
import { parseResBufferMsg as TenhouParseResBufferMsg } from './tenhou/parseResBufferMsg'
import type { BaseAnalyser } from './types/Analyser'
import type { GameNameString } from './types/General'
import type { Pai } from './types/Mjai'
import UI from './UI'

function printIDerror (): void {
  UI.print('未获取玩家的ID或ID错误, 请重启游戏')
  UI.print('牌局记录创建失败, 本场游戏不会进行分析')
}

/**
 * - 解密并格式化二进制消息
 * - 按流程控制分发给相应的构造器
 * - 调用相应的分析模型分析
 */
class MsgHandler {
  reqQueue: Record<GameNameString, Record<number, { resName: string }>> = {
    majsoul: {},
    tenhou: {}, // never used
  }

  gameMsgParser = {
    majsoul: {
      parseReq: MajsoulParseReqBufferMsg,
      parseRes: MajsoulParseResBufferMsg,
    },
    tenhou: {
      parseReq: () => [],
      parseRes: TenhouParseResBufferMsg,
    },
  }

  async handleReq (bufferMsg: Buffer, gameName: GameNameString): Promise<void> {
    if (!Object.keys(this.reqQueue).includes(gameName)) { return } // 不支持的游戏平台
    const _rand = ~~(Math.random() * 10000)
    logger.info(`<req-handler> Begin to handle ReqMsg(${gameName}${_rand}): ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const msgList = this.gameMsgParser[gameName].parseReq(bufferMsg)
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
    if (!Object.keys(this.reqQueue).includes(gameName)) { return } // 不支持的游戏平台
    if (this.analyser === undefined) { return } /* analyser 未初始化 */

    const parseOptions = {
      meID: (meID !== undefined && meID.length > 0) ? meID : this.meID,
      meSeat: this.game?.meSeat,
      lastDahai: this.lastDahai,
    }

    /* ----------------------- */
    /*       转译模块 START     */
    /* ----------------------- */
    const _rand = ~~(Math.random() * 10000)
    logger.info(`<res-handler> Begin to handle ResMsg(${gameName}${_rand}): ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const [mjaiEventList, actionCandidateList] = this.gameMsgParser[gameName].parseRes(bufferMsg, this.reqQueue[gameName], parseOptions)
    if (parseOptions.meID !== undefined && parseOptions.meID.length > 0) { this.meID = parseOptions.meID }
    logger.info(`<res-handler> Parsed ResMsg(${gameName}${_rand}) meID=${parseOptions.meID ?? ''} meSeat=${parseOptions.meSeat ?? ''} ${JSON.stringify(structuredClone(mjaiEventList))}`)
    /* --------------------- */
    /*      Majsoul END      */
    /* ------------ -------- */

    if (mjaiEventList.length === 0) { return }

    /* ------------------------------ */
    /*    GameRecorder 模块 START     */
    /* ----------------------------- */
    logger.info('<res-handler> GameRecorder start')
    for (const mjaiEvent of mjaiEventList) {
      if (mjaiEvent.type === 'dahai') {
        this.lastDahai = { actor: mjaiEvent.actor, pai: mjaiEvent.pai }
      }
      if (mjaiEvent.type === 'start_kyoku') {
        this.lastDahai = undefined
      }
      /* ======================== */
      /*        Game进程通知       */
      /* ======================== */
      if (mjaiEvent.type === 'start_game') { /* 整场游戏开始, 创建新游戏记录实例 */
        const meSeat = mjaiEvent.id
        if (meSeat === -1) { return printIDerror() }
        this.game = new Game({ meSeat })
        continue
      }
      if (mjaiEvent.type === 'end_game') { /* 整场游戏结束, 销毁游戏记录实例 */
        delete this.game
        continue
      }
      if (this.game === undefined) { break } /* 如果没有创建Game实例, 说明ID等有问题, 不进行下面的分析 */
      /* ======================== */
      /*        记录牌桌状态       */
      /* ======================== */
      const recordedStepNum = record(this.game, mjaiEvent)
      UI.print(`new msg... ${recordedStepNum}`, mjaiEvent)
    }
    logger.info('<res-handler> GameRecorder end')
    /* ---------------------------- */
    /*    GameRecorder 模块 END     */
    /* --------------------------- */

    if (this.game?.rounds[this.game.roundPointer] === undefined) { return } /* 如果没有创建Game实例或无即时Round, 不进行下面的分析 */
    if (this.analyser === undefined) { return } /* 如果没有analyser, 不进行下面的分析 */
    if (actionCandidateList.length === 0) { return } /* 如果没有备选操作, 不进行下面的分析 */

    /* ---------------------------- */
    /*     Analyser 模块 START      */
    /*       处理 operations        */
    /* ---------------------------- */
    logger.info('<res-handler> Analyser start')
    UI.print('action candidates', actionCandidateList)
    const round = this.game.rounds[this.game.roundPointer]
    const mjaiActionList = analyserModule.detailizeActionCandidateList(actionCandidateList, round)
    UI.print('analysing actions', mjaiActionList)
    const { choice: operationChoice, info } = await this.analyser.analyseOperations(mjaiActionList, round)
    UI.print('choice: ', JSON.stringify(structuredClone(operationChoice)), ' | ', info)
    logger.info('<res-handler> Analyser end')
    /* -------------------------- */
    /*     Analyser 模块 END      */
    /*      处理 operations       */
    /* -------------------------- */

    logger.info(`<res-handler> handled ResMsg${_rand}`)
  }

  game?: Game

  meID?: string

  lastDahai?: { actor: number, pai: Pai }

  analyser?: BaseAnalyser
  setAnalyser (analyser: BaseAnalyser): void { this.analyser = analyser }
}

export { MsgHandler }
