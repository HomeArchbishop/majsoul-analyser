import structuredClone from '@ungap/structured-clone'

import logger from '@/logger'
import type { Platform, PlatformProcessResult, PlatformSession, WireParseResult } from '@/platforms/types'
import type {
  ActionCandidateList,
  MjaiAction,
  MjaiEvent,
  MjaiEventList,
  Pai,
} from '@/types/Mjai'

/**
 * 原生 MJAI 客户端入站载荷（UTF-8 JSON），支持：
 * - 单条 event
 * - event 数组
 * - 信封：{ events, candidates?, possible_actions? }
 *
 * `candidates` 为本项目粗粒度候选项；
 * `possible_actions` 为完整 MJAI action，会折叠成 candidates 再交给 pipeline。
 */
type MjaiWireEnvelope = {
  events: MjaiEventList
  candidates?: ActionCandidateList
  possible_actions?: MjaiAction[]
}

function isRecord (v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isMjaiEvent (v: unknown): v is MjaiEvent {
  return isRecord(v) && typeof v.type === 'string'
}

function isMjaiAction (v: unknown): v is MjaiAction {
  return isRecord(v) && typeof v.type === 'string'
}

function isActionCandidate (v: unknown): v is ActionCandidateList[number] {
  if (!isRecord(v) || typeof v.type !== 'string') { return false }
  switch (v.type) {
    case 'dahai':
    case 'nuki':
    case 'ryukyoku':
      return true
    case 'hora':
      return v.tsumo === undefined || typeof v.tsumo === 'boolean'
    case 'chi':
    case 'pon':
    case 'kakan':
    case 'daiminkan':
    case 'ankan':
      return Array.isArray(v.consumedList)
    case 'reach':
      return Array.isArray(v.pais)
    default:
      return false
  }
}

/** 把完整 possible_actions 折成 pipeline 用的粗粒度 candidates */
function possibleActionsToCandidates (actions: MjaiAction[]): ActionCandidateList {
  let hasDahai = false
  let hasNuki = false
  let hasRyukyoku = false
  let hasHoraTsumo = false
  let hasHoraRon = false
  const chiConsumed: Pai[][] = []
  const ponConsumed: Pai[][] = []
  const daiminkanConsumed: Pai[][] = []
  const ankanConsumed: Pai[][] = []
  const kakanConsumed: Pai[][] = []
  const reachPais: Pai[] = []

  for (const action of actions) {
    switch (action.type) {
      case 'dahai':
        hasDahai = true
        break
      case 'chi':
        chiConsumed.push([...action.consumed])
        break
      case 'pon':
        ponConsumed.push([...action.consumed])
        break
      case 'daiminkan':
        daiminkanConsumed.push([...action.consumed])
        break
      case 'ankan':
        ankanConsumed.push([...action.consumed])
        break
      case 'kakan':
        kakanConsumed.push([...action.consumed])
        break
      case 'reach':
        if (action.pai !== undefined) { reachPais.push(action.pai) }
        break
      case 'hora':
        if (action.target === undefined) { hasHoraTsumo = true } else { hasHoraRon = true }
        break
      case 'nuki':
        hasNuki = true
        break
      case 'ryukyoku':
        hasRyukyoku = true
        break
      case 'none':
        break
    }
  }

  const candidates: ActionCandidateList = []
  if (hasDahai) { candidates.push({ type: 'dahai' }) }
  if (chiConsumed.length > 0) { candidates.push({ type: 'chi', consumedList: chiConsumed }) }
  if (ponConsumed.length > 0) { candidates.push({ type: 'pon', consumedList: ponConsumed }) }
  if (daiminkanConsumed.length > 0) {
    candidates.push({ type: 'daiminkan', consumedList: daiminkanConsumed })
  }
  if (ankanConsumed.length > 0) { candidates.push({ type: 'ankan', consumedList: ankanConsumed }) }
  if (kakanConsumed.length > 0) { candidates.push({ type: 'kakan', consumedList: kakanConsumed }) }
  if (reachPais.length > 0) { candidates.push({ type: 'reach', pais: [...new Set(reachPais)] }) }
  if (hasHoraTsumo) { candidates.push({ type: 'hora', tsumo: true }) }
  if (hasHoraRon) { candidates.push({ type: 'hora' }) }
  if (hasNuki) { candidates.push({ type: 'nuki' }) }
  if (hasRyukyoku) { candidates.push({ type: 'ryukyoku' }) }
  return candidates
}

function parseCandidates (raw: unknown): ActionCandidateList {
  if (!Array.isArray(raw)) { return [] }
  return raw.filter(isActionCandidate)
}

function parsePossibleActions (raw: unknown): MjaiAction[] {
  if (!Array.isArray(raw)) { return [] }
  return raw.filter(isMjaiAction)
}

function parseEvents (raw: unknown): MjaiEventList {
  if (Array.isArray(raw)) {
    return raw.filter(isMjaiEvent)
  }
  if (isMjaiEvent(raw)) {
    return [raw]
  }
  return []
}

function decodeWire (buffer: Buffer): MjaiWireEnvelope | null {
  const text = buffer.toString('utf8').trim()
  if (text.length === 0) { return null }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    logger.info('<parser> mjai: invalid JSON')
    return null
  }

  // 信封
  if (isRecord(parsed) && Array.isArray(parsed.events)) {
    return {
      events: parseEvents(parsed.events),
      candidates: parsed.candidates !== undefined
        ? parseCandidates(parsed.candidates)
        : undefined,
      possible_actions: parsed.possible_actions !== undefined
        ? parsePossibleActions(parsed.possible_actions)
        : undefined,
    }
  }

  // 单条 / 数组
  const events = parseEvents(parsed)
  if (events.length === 0) { return null }
  return { events }
}

function wireToResult (wire: MjaiWireEnvelope): WireParseResult {
  let candidates: ActionCandidateList = []
  if (wire.candidates !== undefined && wire.candidates.length > 0) {
    candidates = wire.candidates
  } else if (wire.possible_actions !== undefined && wire.possible_actions.length > 0) {
    candidates = possibleActionsToCandidates(wire.possible_actions)
  }
  return { events: wire.events, candidates }
}

function createSession (): PlatformSession {
  return {}
}

function onOutbound (_buffer: Buffer, session: PlatformSession): PlatformProcessResult {
  return { result: { events: [], candidates: [] }, session }
}

function onInbound (buffer: Buffer, session: PlatformSession): PlatformProcessResult {
  const wire = decodeWire(buffer)
  logger.info(`<parser> mjai wire: ${JSON.stringify(structuredClone(wire))}`)
  if (wire === null) {
    return { result: { events: [], candidates: [] }, session }
  }
  return { result: wireToResult(wire), session }
}

export const mjaiPlatform: Platform = {
  createSession,
  onOutbound,
  onInbound,
}
