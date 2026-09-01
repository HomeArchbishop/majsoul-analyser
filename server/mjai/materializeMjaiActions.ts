import findLastIndex from 'lodash.findlastindex'

import { Round } from '../board/Round'
import type {
  ActionCandidateList,
  EventDahai,
  MjaiAction,
  MjaiActionList,
  Pai,
} from '../types/Mjai'

type Candidate = ActionCandidateList[number]

type ActionContext = {
  latestIncomingPai: Pai | undefined
  latestOpponentDiscard: EventDahai | undefined
}

const INCOMING_TILE_EVENT_TYPES = new Set([
  'chi',
  'pon',
  'daiminkan',
  'ankan',
  'kakan',
  'tsumo',
])

function buildActionContext (round: Round): ActionContext {
  return {
    latestIncomingPai: findLatestIncomingPai(round),
    latestOpponentDiscard: findLatestOpponentDiscard(round),
  }
}

function findLatestIncomingPai (round: Round): Pai | undefined {
  const index = findLastIndex(round.events, event => {
    return INCOMING_TILE_EVENT_TYPES.has(event.type) &&
      'actor' in event &&
      event.actor === round.meSeat
  })
  if (index === -1) { return undefined }
  return (round.events[index] as { pai: Pai }).pai
}

function findLatestOpponentDiscard (round: Round): EventDahai | undefined {
  const index = findLastIndex(round.events, event => {
    return event.type === 'dahai' && event.actor !== round.meSeat
  })
  if (index === -1) { return undefined }
  return round.events[index] as EventDahai
}

function expandDahai (round: Round, incomingPai: Pai | undefined): MjaiAction[] {
  if (incomingPai === undefined) { return [] }

  const actions: MjaiAction[] = []
  let incomingPaiSeen = false

  for (const pai of round.players[round.meSeat].tehai) {
    if (pai === '?') { break }
    actions.push({
      type: 'dahai',
      pai,
      tsumogiri: !incomingPaiSeen && pai === incomingPai,
    })
    incomingPaiSeen = pai === incomingPai
  }

  return actions
}

function expandChiPonDaiminkan (
  type: 'chi' | 'pon' | 'daiminkan',
  consumedList: Pai[][],
  discard: EventDahai,
): MjaiAction[] {
  return consumedList.map(consumed => {
    const base = { pai: discard.pai, target: discard.actor, consumed }
    switch (type) {
      case 'chi': return { type: 'chi', ...base }
      case 'pon': return { type: 'pon', ...base }
      case 'daiminkan': return { type: 'daiminkan', ...base }
      default: throw new Error(`Invalid call type: ${type}`)
    }
  })
}

function expandAnkanKakan (
  type: 'ankan' | 'kakan',
  consumedList: Pai[][],
  pai: Pai,
): MjaiAction[] {
  return consumedList.map(consumed => {
    switch (type) {
      case 'kakan': return { type: 'kakan', pai, consumed }
      case 'ankan': return { type: 'ankan', pai, consumed }
      default: throw new Error(`Invalid self meld type: ${type}`)
    }
  })
}

function expandHora (
  candidate: Extract<Candidate, { type: 'hora' }>,
  discard: EventDahai | undefined,
): MjaiAction[] {
  if (candidate.tsumo === true) {
    return [{ type: 'hora' }]
  }
  if (discard === undefined) { return [] }
  return [{
    type: 'hora',
    target: discard.actor,
    pai: discard.pai,
  }]
}

function expandCandidate (
  candidate: Candidate,
  context: ActionContext,
  round: Round,
): MjaiAction[] {
  const { latestIncomingPai, latestOpponentDiscard } = context

  switch (candidate.type) {
    case 'dahai':
      return expandDahai(round, latestIncomingPai)
    case 'pon':
    case 'chi':
    case 'daiminkan':
      if (latestOpponentDiscard === undefined) { return [] }
      return expandChiPonDaiminkan(
        candidate.type,
        candidate.consumedList,
        latestOpponentDiscard,
      )
    case 'kakan':
    case 'ankan':
      if (latestIncomingPai === undefined) { return [] }
      return expandAnkanKakan(
        candidate.type,
        candidate.consumedList,
        latestIncomingPai,
      )
    case 'reach':
      return candidate.pais.map(pai => ({ type: 'reach', pai }))
    case 'nuki':
      return [{ type: 'nuki' }]
    case 'hora':
      return expandHora(candidate, latestOpponentDiscard)
    case 'ryukyoku':
      return [{ type: 'ryukyoku' }]
  }
}

/** 将平台粗粒度候选项展开为完整 MJAI 合法动作列表。 */
export function materializeMjaiActions (
  candidates: ActionCandidateList,
  round: Round,
): MjaiActionList {
  if (candidates.length === 0) { return [] }

  const context = buildActionContext(round)
  const actions = candidates.flatMap(candidate => {
    return expandCandidate(candidate, context, round)
  })

  if (!candidates.some(candidate => candidate.type === 'dahai')) {
    actions.push({ type: 'none' })
  }

  return actions
}
