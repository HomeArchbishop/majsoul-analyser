import structuredClone from '@ungap/structured-clone'

import logger from '../../logger'
import type { ActionCandidateList, MjaiEventList, Pai } from '../../types/Mjai'
import { ActionPrototype } from '../../types/ParsedMajsoulJSON'
import type { Platform, PlatformProcessResult, PlatformSession } from '../types'
import { decodeMajsoulWire } from './decode'
import { extractResCorrelation } from './extractResCorrelation'
import { inferMeSeatFromAction, resolveMeSeatFromAuth } from './inferMeSeat'
import { actionToMjai } from './toMjai'

interface MajsoulSession extends PlatformSession {
  /** 己方座位；未确定前为空。与 board `Game.meSeat` 同名同义。 */
  meSeat?: number
  awaitingMeSeat: boolean
  lastDahai?: { actor: number, pai: Pai }
  /** Outbound request index → expected inbound res type name. */
  resByIndex: Record<number, { resName: string }>
  pendingActionNewRound?: ActionPrototype
}

function createSession (): MajsoulSession {
  return {
    awaitingMeSeat: false,
    resByIndex: {},
  }
}

function asMajsoulSession (session: PlatformSession): MajsoulSession {
  return session as MajsoulSession
}

function emptyResult (session: MajsoulSession): PlatformProcessResult {
  return { result: { events: [], candidates: [] }, session }
}

function onOutbound (buffer: Buffer, session: PlatformSession): PlatformProcessResult {
  const state = asMajsoulSession(session)
  const correlations = extractResCorrelation(buffer)
  for (const { index, resName } of correlations) {
    state.resByIndex[index] = { resName }
  }
  return emptyResult(state)
}

function onInbound (buffer: Buffer, session: PlatformSession): PlatformProcessResult {
  const state = asMajsoulSession(session)
  const wire = decodeMajsoulWire(buffer, state.resByIndex)
  logger.info(`<parser> parsed wire buffer: ${JSON.stringify(structuredClone(wire))}`)
  if (wire === null) {
    return emptyResult(state)
  }

  const events: MjaiEventList = []
  const candidates: ActionCandidateList = []

  if (wire.name === 'ResLogin') {
    return { result: { events, candidates }, session: state }
  }

  if (wire.name === 'ResAuthGame') {
    if (wire.data.error !== null && wire.data.error !== undefined) {
      return { result: { events, candidates }, session: state }
    }
    if (wire.data.seat_list.length < 1) {
      return { result: { events, candidates }, session: state }
    }
    const meSeat = resolveMeSeatFromAuth(wire.data)
    if (meSeat !== -1) {
      state.meSeat = meSeat
      state.awaitingMeSeat = false
      state.pendingActionNewRound = undefined
      events.push({ type: 'start_game', id: meSeat })
    } else {
      state.meSeat = undefined
      state.awaitingMeSeat = true
      logger.info('<parser> ResAuthGame: meSeat unresolved, will infer from later actions.')
    }
  }

  if (wire.name === 'NotifyGameTerminate') {
    events.push({ type: 'end_game' })
    state.awaitingMeSeat = false
    state.pendingActionNewRound = undefined
  }

  if (wire.name === 'ActionPrototype') {
    appendAction(wire, state, events, candidates)
  }

  if (
    wire.name === 'ResSyncGame' &&
    wire.data.game_restore !== undefined &&
    wire.data.game_restore !== null &&
    !wire.data.is_end
  ) {
    if (state.meSeat === undefined) {
      for (const action of wire.data.game_restore.actions) {
        const inferred = inferMeSeatFromAction({ name: 'ActionPrototype', data: action })
        if (inferred !== undefined) {
          state.meSeat = inferred
          state.awaitingMeSeat = false
          events.push({ type: 'start_game', id: inferred })
          break
        }
      }
    }
    if (state.meSeat === undefined) {
      logger.info('<parser> ResSyncGame: still cannot resolve meSeat')
      return { result: { events, candidates }, session: state }
    }
    for (const action of wire.data.game_restore.actions) {
      const result = actionToMjai(
        { name: 'ActionPrototype', data: action },
        state.meSeat,
        { lastDahai: state.lastDahai },
      )
      events.push(...result.events)
      candidates.length = 0
      candidates.push(...result.candidates)
      state.lastDahai = result.lastDahai
    }
  }

  return { result: { events, candidates }, session: state }
}

function appendAction (
  wire: ActionPrototype,
  state: MajsoulSession,
  events: MjaiEventList,
  candidates: ActionCandidateList,
): void {
  if (state.meSeat === undefined) {
    const inferred = inferMeSeatFromAction(wire)
    if (inferred === undefined) {
      if (wire.data.name === 'ActionNewRound') {
        state.pendingActionNewRound = wire
        state.awaitingMeSeat = true
        logger.info('<parser> buffer ActionNewRound until meSeat is known')
      }
      return
    }
    state.meSeat = inferred
    state.awaitingMeSeat = false
    events.push({ type: 'start_game', id: inferred })
    logger.info(`<parser> inferred meSeat=${inferred} from ${wire.data.name}`)

    if (
      state.pendingActionNewRound !== undefined &&
      state.pendingActionNewRound !== wire
    ) {
      const pending = actionToMjai(
        state.pendingActionNewRound,
        inferred,
        { lastDahai: state.lastDahai },
      )
      events.push(...pending.events)
      candidates.push(...pending.candidates)
      state.lastDahai = pending.lastDahai
      state.pendingActionNewRound = undefined
    }
  }

  const meSeat = state.meSeat
  const result = actionToMjai(
    wire,
    meSeat,
    { lastDahai: state.lastDahai },
  )
  events.push(...result.events)
  candidates.length = 0
  candidates.push(...result.candidates)
  state.lastDahai = result.lastDahai
}

const majsoulPlatform: Platform = {
  createSession,
  onOutbound,
  onInbound,
}

export { majsoulPlatform }
