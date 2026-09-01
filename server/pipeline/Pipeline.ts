import structuredClone from '@ungap/structured-clone'

import { applyEvent } from '../board/applyEvent'
import { Game } from '../board/Game'
import logger from '../logger'
import { expandActionCandidates } from '../mjai/expandCandidates'
import { getPlatform, type Platform, type PlatformId, type PlatformSession } from '../platforms/registry'
import type { BaseAnalyser } from '../types/Analyser'
import type { EventStartGame, MjaiEventList } from '../types/Mjai'
import UI from '../UI'
import { nextTraceId } from '../utils/misc'

function printSeatError (): void {
  UI.print('未能确定己方座位, 请重启游戏')
  UI.print('牌局记录创建失败, 本场游戏不会进行分析')
}

class Pipeline {
  platformId?: PlatformId
  session?: PlatformSession
  game?: Game
  analyser?: BaseAnalyser

  setAnalyser (analyser: BaseAnalyser): void {
    this.analyser = analyser
  }

  /** Client → server wire (may only update platform session). */
  async handleOutbound (bufferMsg: Buffer, platformId: PlatformId): Promise<void> {
    const platform = getPlatform(platformId)
    const session = this.ensureSession(platformId)
    const traceId = nextTraceId()
    logger.info(`<outbound> Begin (${platformId}#${traceId}): ${JSON.stringify(bufferMsg.toJSON().data)}`)
    const { session: next } = platform.onOutbound(bufferMsg, session)
    this.session = next
    logger.info(`<outbound> Done (${platformId}#${traceId})`)
  }

  /** Server → client wire → board → analyse. */
  async handleInbound (bufferMsg: Buffer, platformId: PlatformId): Promise<void> {
    if (this.analyser === undefined) { return }

    const platform = getPlatform(platformId)
    const session = this.ensureSession(platformId)
    const traceId = nextTraceId()
    logger.info(`<inbound> Begin (${platformId}#${traceId}): ${JSON.stringify(bufferMsg.toJSON().data)}`)

    const { result, session: next } = platform.onInbound(bufferMsg, session)
    this.session = next

    const { events: mjaiEventList, candidates: actionCandidateList } = result

    logger.info(
      `<inbound> Parsed (${platformId}#${traceId}) ${JSON.stringify(structuredClone(mjaiEventList))}`,
    )

    if (mjaiEventList.length === 0) { return }

    this.applyEvents(mjaiEventList, platform)

    if (this.game?.rounds[this.game.roundPointer] === undefined) { return }
    if (actionCandidateList.length === 0) { return }

    logger.info('<inbound> Analyser start')
    UI.print('action candidates', actionCandidateList)
    const round = this.game.rounds[this.game.roundPointer]
    const mjaiActionList = expandActionCandidates(actionCandidateList, round)
    UI.print('analysing actions', mjaiActionList)
    const { choice: actionChoice, info } = await this.analyser.analyseActions(mjaiActionList, round)
    UI.print('choice: ', JSON.stringify(structuredClone(actionChoice)), ' | ', info)
    logger.info('<inbound> Analyser end')
    logger.info(`<inbound> Done (${platformId}#${traceId})`)
  }

  private ensureSession (platformId: PlatformId): PlatformSession {
    if (this.platformId !== platformId || this.session === undefined) {
      this.platformId = platformId
      this.session = getPlatform(platformId).createSession()
      delete this.game
    }
    return this.session
  }

  private applyEvents (events: MjaiEventList, platform: Platform): void {
    logger.info('<inbound> board apply start')
    for (const event of events) {
      if (event.type === 'start_game') {
        this.beginGame(event)
        continue
      }
      if (event.type === 'end_game') {
        this.endGame(platform)
        continue
      }
      if (this.game === undefined) { break }
      const stepIndex = applyEvent(this.game, event)
      UI.print(`new msg... ${stepIndex}`, event)
    }
    logger.info('<inbound> board apply end')
  }

  private beginGame (event: EventStartGame): void {
    if (event.id < 0) {
      return printSeatError()
    }
    this.game = new Game({ meSeat: event.id })
  }

  private endGame (platform: Platform): void {
    delete this.game
    this.session = platform.createSession()
  }
}

export { Pipeline }
