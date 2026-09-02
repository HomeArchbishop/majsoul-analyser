import { toBakaze, wirePaiListToMjai, wirePaiToMjai } from '@/platforms/majsoul/pai'
import type { ActionCandidateList, MjaiEventList, Pai } from '@/types/Mjai'
import type {
  ActionAnGangAddGang,
  ActionBaBei,
  ActionChiPengGang,
  ActionDealTile,
  ActionDiscardTile,
  ActionHule,
  ActionLiuJu,
  ActionNewRound,
  ActionNoTile,
  ActionPrototype,
  OptionalOperationList,
} from '@/types/ParsedMajsoulJSON'
import { sortPai } from '@/utils/pai'

export interface ActionToMjaiCtx {
  lastDahai?: { actor: number, pai: Pai }
  /** 已从雀魂 doras[] 同步到 MJAI 的指示牌数量 */
  doraMarkerCount: number
}

export interface ActionToMjaiResult {
  events: MjaiEventList
  candidates: ActionCandidateList
  lastDahai?: { actor: number, pai: Pai }
  doraMarkerCount: number
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

/** 雀魂 doras 为累计指示牌列表；只追加尚未同步的项（避免 DealTile 重复、漏掉 DiscardTile 新翻） */
function syncDoraFromWire (
  events: MjaiEventList,
  doras: string[] | undefined,
  ctx: ActionToMjaiCtx,
): void {
  if (doras === undefined || doras.length === 0) { return }
  for (let i = ctx.doraMarkerCount; i < doras.length; i++) {
    events.push({ type: 'dora', dora_marker: wirePaiToMjai(doras[i]) })
  }
  ctx.doraMarkerCount = doras.length
}

function convertNewRound (
  actionData: ActionNewRound,
  meSeat: number,
  ctx: ActionToMjaiCtx,
): { events: MjaiEventList, lastDahai: undefined } {
  const sortedTiles = sortPai(wirePaiListToMjai(actionData.tiles))
  const oya = actionData.ju % actionData.scores.length
  ctx.doraMarkerCount = actionData.doras.length

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

function convertAnGangAddGang (actionData: ActionAnGangAddGang, ctx: ActionToMjaiCtx): MjaiEventList {
  const events: MjaiEventList = []
  const tile = wirePaiToMjai(actionData.tiles)

  // ActionAnGangAddGang.type: 2=加杠, 3=暗杠（与 OptionalOperation 的 type 编号不同）
  if (actionData.type === 2) {
    events.push({
      type: 'kakan',
      actor: actionData.seat,
      pai: tile,
      consumed: [tile, tile, tile],
    })
  } else if (actionData.type === 3) {
    events.push({
      type: 'ankan',
      actor: actionData.seat,
      consumed: [tile, tile, tile, tile],
    })
  }

  syncDoraFromWire(events, actionData.doras, ctx)
  return events
}

function convertChiPengGang (actionData: ActionChiPengGang, ctx: ActionToMjaiCtx): MjaiEventList {
  const events: MjaiEventList = []
  const tiles = wirePaiListToMjai(actionData.tiles)

  if (actionData.type === 2) {
    const target = actionData.froms.find(seat => seat !== actionData.seat) as number
    const calledPai = ctx.lastDahai?.actor === target
      ? ctx.lastDahai.pai
      : tiles[0]
    events.push({
      type: 'daiminkan',
      actor: actionData.seat,
      target,
      pai: calledPai,
      consumed: tiles.slice(0, 3),
    })
    syncDoraFromWire(events, actionData.doras, ctx)
    return events
  }

  if (actionData.type === 0) {
    const target = actionData.froms.find(seat => seat !== actionData.seat) as number
    const targetIndex = actionData.froms.findIndex(seat => seat === target)
    const calledPai = ctx.lastDahai?.actor === target
      ? ctx.lastDahai.pai
      : tiles[targetIndex]
    events.push({
      type: 'chi',
      actor: actionData.seat,
      target,
      pai: calledPai,
      consumed: tiles.filter((_, index) => actionData.froms[index] === actionData.seat),
    })
    return events
  }

  if (actionData.type === 1) {
    const target = actionData.froms.find(seat => seat !== actionData.seat) as number
    const calledPai = ctx.lastDahai?.actor === target
      ? ctx.lastDahai.pai
      : tiles[0]
    events.push({
      type: 'pon',
      actor: actionData.seat,
      target,
      pai: calledPai,
      consumed: tiles.slice(0, 2),
    })
  }

  return events
}

function convertDealTile (actionData: ActionDealTile, ctx: ActionToMjaiCtx): MjaiEventList {
  const events: MjaiEventList = [{
    type: 'tsumo',
    actor: actionData.seat,
    pai: actionData.tile !== '' ? wirePaiToMjai(actionData.tile) : '?',
  }]
  syncDoraFromWire(events, actionData.doras, ctx)
  return events
}

function convertDiscardTile (actionData: ActionDiscardTile, ctx: ActionToMjaiCtx): {
  events: MjaiEventList
  lastDahai: { actor: number, pai: Pai }
} {
  const events: MjaiEventList = []
  if (actionData.is_liqi || actionData.is_wliqi) {
    events.push({ type: 'reach', actor: actionData.seat })
  }

  syncDoraFromWire(events, actionData.doras, ctx)

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

function scoresFromNoTile (actionData: ActionNoTile): number[] | undefined {
  if (!actionData.scores?.length) { return undefined }

  const first = actionData.scores[0]
  if (first.old_scores?.length && first.delta_scores?.length) {
    const n = Math.max(first.old_scores.length, first.delta_scores.length)
    return Array.from({ length: n }, (_, i) =>
      (first.old_scores[i] ?? 0) + (first.delta_scores[i] ?? 0),
    )
  }

  const bySeat: number[] = []
  for (const entry of actionData.scores) {
    if (entry.old_scores?.length && entry.delta_scores?.length) {
      bySeat[entry.seat] =
        (entry.old_scores[entry.seat] ?? 0) + (entry.delta_scores[entry.seat] ?? 0)
    } else if (entry.score !== undefined) {
      bySeat[entry.seat] = entry.score
    }
  }
  return bySeat.length > 0 ? bySeat.map(score => score ?? 0) : undefined
}

function convertNoTile (actionData: ActionNoTile): MjaiEventList {
  const events: MjaiEventList = [{ type: 'ryukyoku', reason: 'haitei' }]
  const scores = scoresFromNoTile(actionData)
  events.push(scores !== undefined ? { type: 'end_kyoku', scores } : { type: 'end_kyoku' })
  return events
}

function convertLiuJu (actionData: ActionLiuJu): MjaiEventList {
  const events: MjaiEventList = [{ type: 'ryukyoku' }]
  const scores = actionData.gameend?.scores
  events.push(scores?.length ? { type: 'end_kyoku', scores } : { type: 'end_kyoku' })
  return events
}

type OptionalOperation = OptionalOperationList['operation_list'][number]

function convertActionEvents (
  action: ActionData,
  meSeat: number,
  ctx: ActionToMjaiCtx,
): { events: MjaiEventList, lastDahai: ActionToMjaiCtx['lastDahai'] } {
  switch (action.name) {
    case 'ActionNewRound': {
      const result = convertNewRound(action.data as ActionNewRound, meSeat, ctx)
      return { events: result.events, lastDahai: result.lastDahai }
    }
    case 'ActionAnGangAddGang':
      return { events: convertAnGangAddGang(action.data as ActionAnGangAddGang, ctx), lastDahai: ctx.lastDahai }
    case 'ActionChiPengGang':
      return { events: convertChiPengGang(action.data as ActionChiPengGang, ctx), lastDahai: ctx.lastDahai }
    case 'ActionBaBei': {
      const data = action.data as ActionBaBei
      const events: MjaiEventList = [{ type: 'nuki', actor: data.seat }]
      syncDoraFromWire(events, data.doras, ctx)
      return { events, lastDahai: ctx.lastDahai }
    }
    case 'ActionDealTile':
      return { events: convertDealTile(action.data as ActionDealTile, ctx), lastDahai: ctx.lastDahai }
    case 'ActionDiscardTile': {
      const result = convertDiscardTile(action.data as ActionDiscardTile, ctx)
      return { events: result.events, lastDahai: result.lastDahai }
    }
    case 'ActionHule':
      return { events: convertHule(action.data as ActionHule, ctx.lastDahai), lastDahai: ctx.lastDahai }
    case 'ActionLiuJu':
      return {
        events: convertLiuJu(action.data as ActionLiuJu),
        lastDahai: ctx.lastDahai,
      }
    case 'ActionNoTile':
      return { events: convertNoTile(action.data as ActionNoTile), lastDahai: ctx.lastDahai }
    default:
      return { events: [], lastDahai: ctx.lastDahai }
  }
}

function hasMyOperation (action: ActionData, meSeat: number): action is ActionData & {
  data: { operation: OptionalOperationList }
} {
  if (!ACTIONS_WITH_OPERATION.has(action.name)) { return false }
  const operation = (action.data as { operation?: OptionalOperationList | null }).operation
  return operation !== null && operation !== undefined &&
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
  const { events, lastDahai } = convertActionEvents(wire.data, meSeat, ctx)
  const candidates = convertOperationCandidates(wire.data, meSeat)
  return { events, candidates, lastDahai, doraMarkerCount: ctx.doraMarkerCount }
}
