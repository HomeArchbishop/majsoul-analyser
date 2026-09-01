import { toBakaze, wirePaiListToMjai, wirePaiToMjai } from '@/platforms/majsoul/pai'
import type { ActionCandidateList, MjaiEventList, Pai } from '@/types/Mjai'
import type {
  ActionAnGangAddGang,
  ActionBaBei,
  ActionChiPengGang,
  ActionDealTile,
  ActionDiscardTile,
  ActionHule,
  ActionNewRound,
  ActionNoTile,
  ActionPrototype,
  OptionalOperationList,
} from '@/types/ParsedMajsoulJSON'
import { sortPai } from '@/utils/pai'

export interface ActionToMjaiCtx {
  lastDahai?: { actor: number, pai: Pai }
}

export interface ActionToMjaiResult {
  events: MjaiEventList
  candidates: ActionCandidateList
  lastDahai?: { actor: number, pai: Pai }
}

type ActionData = ActionPrototype['data']

const ACTIONS_WITH_OPERATION = new Set([
  'ActionNewRound',
  'ActionAnGangAddGang',
  'ActionBaBei',
  'ActionChiPengGang',
  'ActionDealTile',
  'ActionDiscardTile',
])

function toConsumedList (combination: string[]): Pai[][] {
  return combination.map(entry => wirePaiListToMjai(entry.split('|')))
}

function appendDora (events: MjaiEventList, doras: string[] | undefined): void {
  if (doras === undefined || doras.length === 0) { return }
  events.push({ type: 'dora', dora_marker: wirePaiToMjai(doras.at(-1)!) })
}

function convertNewRound (
  actionData: ActionNewRound,
  meSeat: number,
): { events: MjaiEventList, lastDahai: undefined } {
  const sortedTiles = sortPai(wirePaiListToMjai(actionData.tiles))
  const oya = actionData.ju % actionData.scores.length

  return {
    events: [
      {
        type: 'start_kyoku',
        bakaze: toBakaze(actionData.chang),
        dora_marker: wirePaiToMjai(actionData.doras[0]),
        kyoku: actionData.ju + 1,
        honba: actionData.ben,
        kyotaku: actionData.liqibang,
        scores: actionData.scores,
        oya,
        tehais: Array.from({ length: 4 }, (_, seat) => {
          if (seat === meSeat) { return sortedTiles.slice(0, 13) }
          return Array.from<Pai>({ length: 13 }).fill('?')
        }),
      },
      {
        type: 'tsumo',
        pai: sortedTiles.length > 13 ? sortedTiles[13] : '?',
        actor: oya,
      },
    ],
    lastDahai: undefined,
  }
}

function convertAnGangAddGang (actionData: ActionAnGangAddGang): MjaiEventList {
  const events: MjaiEventList = []
  const tile = wirePaiToMjai(actionData.tiles)

  if (actionData.type === 3) {
    events.push({
      type: 'ankan',
      actor: actionData.seat,
      consumed: [tile, tile, tile, tile],
    })
  } else if (actionData.type === 4) {
    events.push({
      type: 'kakan',
      actor: actionData.seat,
      pai: tile,
      consumed: [tile, tile, tile],
    })
  }

  appendDora(events, actionData.doras)
  return events
}

function convertChiPengGang (actionData: ActionChiPengGang): MjaiEventList {
  const events: MjaiEventList = []
  const tiles = wirePaiListToMjai(actionData.tiles)

  if (actionData.type === 2) {
    events.push({
      type: 'daiminkan',
      actor: actionData.seat,
      target: actionData.froms.find(seat => seat !== actionData.seat) as number,
      pai: tiles[0],
      consumed: tiles.slice(0, 3),
    })
    appendDora(events, actionData.doras)
    return events
  }

  if (actionData.type === 0) {
    const targetIndex = actionData.froms.findIndex(seat => seat !== actionData.seat)
    events.push({
      type: 'chi',
      actor: actionData.seat,
      target: actionData.froms[targetIndex],
      pai: tiles[targetIndex],
      consumed: tiles.filter((_, index) => actionData.froms[index] === actionData.seat),
    })
    return events
  }

  if (actionData.type === 1) {
    events.push({
      type: 'pon',
      actor: actionData.seat,
      target: actionData.froms.find(seat => seat !== actionData.seat) as number,
      pai: tiles[0],
      consumed: tiles.slice(0, 2),
    })
  }

  return events
}

function convertDealTile (actionData: ActionDealTile): MjaiEventList {
  const events: MjaiEventList = [{
    type: 'tsumo',
    actor: actionData.seat,
    pai: actionData.tile !== '' ? wirePaiToMjai(actionData.tile) : '?',
  }]
  appendDora(events, actionData.doras)
  return events
}

function convertDiscardTile (actionData: ActionDiscardTile): {
  events: MjaiEventList
  lastDahai: { actor: number, pai: Pai }
} {
  const events: MjaiEventList = []
  if (actionData.is_liqi || actionData.is_wliqi) {
    events.push({ type: 'reach', actor: actionData.seat })
  }

  const pai = wirePaiToMjai(actionData.tile)
  events.push({
    type: 'dahai',
    actor: actionData.seat,
    pai,
    tsumogiri: actionData.moqie,
  })

  return { events, lastDahai: { actor: actionData.seat, pai } }
}

function convertHule (
  actionData: ActionHule,
  lastDahai: ActionToMjaiCtx['lastDahai'],
): MjaiEventList {
  const events: MjaiEventList = actionData.hules.map(hule => ({
    type: 'hora',
    actor: hule.seat,
    target: hule.zimo ? undefined : lastDahai?.actor,
    pai: wirePaiToMjai(hule.hu_tile),
  }))
  events.push({ type: 'end_kyoku', scores: actionData.scores })
  return events
}

function convertNoTile (actionData: ActionNoTile): MjaiEventList {
  const events: MjaiEventList = [{ type: 'ryukyoku', reason: 'haitei' }]
  if (actionData.scores?.length) {
    events.push({
      type: 'end_kyoku',
      scores: actionData.scores.map(entry => entry.score),
    })
  } else {
    events.push({ type: 'end_kyoku' })
  }
  return events
}

type OptionalOperation = OptionalOperationList['operation_list'][number]

function convertActionEvents (
  action: ActionData,
  meSeat: number,
  lastDahai: ActionToMjaiCtx['lastDahai'],
): { events: MjaiEventList, lastDahai: ActionToMjaiCtx['lastDahai'] } {
  switch (action.name) {
    case 'ActionNewRound': {
      const result = convertNewRound(action.data as ActionNewRound, meSeat)
      return { events: result.events, lastDahai: result.lastDahai }
    }
    case 'ActionAnGangAddGang':
      return { events: convertAnGangAddGang(action.data as ActionAnGangAddGang), lastDahai }
    case 'ActionChiPengGang':
      return { events: convertChiPengGang(action.data as ActionChiPengGang), lastDahai }
    case 'ActionBaBei':
      return { events: [{ type: 'nuki', actor: (action.data as ActionBaBei).seat }], lastDahai }
    case 'ActionDealTile':
      return { events: convertDealTile(action.data as ActionDealTile), lastDahai }
    case 'ActionDiscardTile': {
      const result = convertDiscardTile(action.data as ActionDiscardTile)
      return { events: result.events, lastDahai: result.lastDahai }
    }
    case 'ActionHule':
      return { events: convertHule(action.data as ActionHule, lastDahai), lastDahai }
    case 'ActionLiuJu':
      return {
        events: [{ type: 'ryukyoku' }, { type: 'end_kyoku' }],
        lastDahai,
      }
    case 'ActionNoTile':
      return { events: convertNoTile(action.data as ActionNoTile), lastDahai }
    default:
      return { events: [], lastDahai }
  }
}

function hasMyOperation (action: ActionData, meSeat: number): action is ActionData & {
  data: { operation: OptionalOperationList }
} {
  if (!ACTIONS_WITH_OPERATION.has(action.name)) { return false }
  const operation = (action.data as { operation: OptionalOperationList | null }).operation
  return operation !== null &&
    operation.seat === meSeat &&
    operation.operation_list.length > 0
}

function operationToCandidate (operation: OptionalOperation): ActionCandidateList[number] | undefined {
  switch (operation.type) {
    case 1: return { type: 'dahai' }
    case 2: return { type: 'chi', consumedList: toConsumedList(operation.combination) }
    case 3: return { type: 'pon', consumedList: toConsumedList(operation.combination) }
    case 4: return { type: 'ankan', consumedList: toConsumedList(operation.combination) }
    case 5: return { type: 'daiminkan', consumedList: toConsumedList(operation.combination) }
    case 6: return { type: 'kakan', consumedList: toConsumedList(operation.combination) }
    case 7:
      return {
        type: 'reach',
        pais: wirePaiListToMjai(Array.from(new Set(operation.combination))),
      }
    case 8: return { type: 'hora', tsumo: true }
    case 9: return { type: 'hora' }
    case 10: return { type: 'ryukyoku' }
    case 11: return { type: 'nuki' }
    default: return undefined
  }
}

function convertOperationCandidates (
  action: ActionData,
  meSeat: number,
): ActionCandidateList {
  if (!hasMyOperation(action, meSeat)) { return [] }

  const candidates: ActionCandidateList = []
  for (const operation of action.data.operation.operation_list) {
    const candidate = operationToCandidate(operation)
    if (candidate !== undefined) {
      candidates.push(candidate)
    }
  }
  return candidates
}

export function actionToMjai (
  wire: ActionPrototype,
  meSeat: number,
  ctx: ActionToMjaiCtx,
): ActionToMjaiResult {
  const { events, lastDahai } = convertActionEvents(wire.data, meSeat, ctx.lastDahai)
  const candidates = convertOperationCandidates(wire.data, meSeat)
  return { events, candidates, lastDahai }
}
