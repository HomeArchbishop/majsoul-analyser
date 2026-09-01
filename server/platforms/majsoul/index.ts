import structuredClone from '@ungap/structured-clone'

import logger from '@/logger'
import { decodeMajsoulWire } from '@/platforms/majsoul/decode'
import { extractResCorrelation } from '@/platforms/majsoul/extractResCorrelation'
import { inferMeSeatFromAction, resolveMeSeatFromAuth } from '@/platforms/majsoul/inferMeSeat'
import { actionToMjai } from '@/platforms/majsoul/toMjai'
import type { Platform, PlatformProcessResult, PlatformSession } from '@/platforms/types'
import type { ActionCandidateList, MjaiEventList, Pai } from '@/types/Mjai'
import type { ActionPrototype, ParsedMajsoulJSON, ResAuthGame } from '@/types/ParsedMajsoulJSON'

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

function pushStartGame (events: MjaiEventList, meSeat: number): void {
  events.push({ type: 'start_game', id: meSeat })
}

function applyActionToState (
  wire: ActionPrototype,
  state: MajsoulSession,
  events: MjaiEventList,
  candidates: ActionCandidateList,
): void {
  const result = actionToMjai(wire, state.meSeat!, { lastDahai: state.lastDahai })
  events.push(...result.events)
  candidates.length = 0
  candidates.push(...result.candidates)
  state.lastDahai = result.lastDahai
}

function tryInferMeSeat (
  wire: ActionPrototype,
  state: MajsoulSession,
  events: MjaiEventList,
): boolean {
  const inferred = inferMeSeatFromAction(wire)
  if (inferred === undefined) { return false }

  state.meSeat = inferred
  state.awaitingMeSeat = false
  pushStartGame(events, inferred)
  logger.info(`<parser> inferred meSeat=${inferred} from ${wire.data.name}`)
  return true
}

function handleResAuthGame (
  wire: ResAuthGame,
  state: MajsoulSession,
  events: MjaiEventList,
): void {
  if (wire.data.error !== null && wire.data.error !== undefined) { return }
  if (wire.data.seat_list.length < 1) { return }

  const meSeat = resolveMeSeatFromAuth(wire.data)
  if (meSeat !== -1) {
    state.meSeat = meSeat
    state.awaitingMeSeat = false
    state.pendingActionNewRound = undefined
    pushStartGame(events, meSeat)
    return
  }

  state.meSeat = undefined
  state.awaitingMeSeat = true
  logger.info('<parser> ResAuthGame: meSeat unresolved, will infer from later actions.')
}

function handleActionPrototype (
  wire: ActionPrototype,
  state: MajsoulSession,
  events: MjaiEventList,
  candidates: ActionCandidateList,
): void {
  if (state.meSeat === undefined) {
    if (!tryInferMeSeat(wire, state, events)) {
      if (wire.data.name === 'ActionNewRound') {
        state.pendingActionNewRound = wire
        state.awaitingMeSeat = true
        logger.info('<parser> buffer ActionNewRound until meSeat is known')
      }
      return
    }

    if (
      state.pendingActionNewRound !== undefined &&
      state.pendingActionNewRound !== wire
    ) {
      applyActionToState(state.pendingActionNewRound, state, events, candidates)
      state.pendingActionNewRound = undefined
    }
  }

  applyActionToState(wire, state, events, candidates)
}

function tryInferMeSeatFromRestore (
  actions: Array<ActionPrototype['data']>,
  state: MajsoulSession,
  events: MjaiEventList,
): boolean {
  for (const action of actions) {
    const inferred = inferMeSeatFromAction({ name: 'ActionPrototype', data: action })
    if (inferred === undefined) { continue }

    state.meSeat = inferred
    state.awaitingMeSeat = false
    pushStartGame(events, inferred)
    return true
  }
  return false
}

function handleResSyncGame (
  wire: Extract<ParsedMajsoulJSON, { name: 'ResSyncGame' }>,
  state: MajsoulSession,
  events: MjaiEventList,
  candidates: ActionCandidateList,
): void {
  const restore = wire.data.game_restore
  if (restore === undefined || restore === null || wire.data.is_end) { return }

  if (state.meSeat === undefined && !tryInferMeSeatFromRestore(restore.actions, state, events)) {
    logger.info('<parser> ResSyncGame: still cannot resolve meSeat')
    return
  }

  for (const action of restore.actions) {
    applyActionToState(
      { name: 'ActionPrototype', data: action },
      state,
      events,
      candidates,
    )
  }
}

function handleInboundWire (
  wire: ParsedMajsoulJSON,
  state: MajsoulSession,
  events: MjaiEventList,
  candidates: ActionCandidateList,
): void {
  switch (wire.name) {
    case 'ResLogin':
      return
    case 'ResAuthGame':
      handleResAuthGame(wire, state, events)
      return
    case 'NotifyGameTerminate':
      events.push({ type: 'end_game' })
      state.awaitingMeSeat = false
      state.pendingActionNewRound = undefined
      return
    case 'ActionPrototype':
      handleActionPrototype(wire, state, events, candidates)
      return
    case 'ResSyncGame':
      handleResSyncGame(wire, state, events, candidates)
  }
}

function onOutbound (buffer: Buffer, session: PlatformSession): PlatformProcessResult {
  const state = asMajsoulSession(session)
  for (const { index, resName } of extractResCorrelation(buffer)) {
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
  handleInboundWire(wire, state, events, candidates)

  return { result: { events, candidates }, session: state }
}

export const majsoulPlatform: Platform = {
  createSession,
  onOutbound,
  onInbound,
}
