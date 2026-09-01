import type { ActionCandidateList, MjaiEventList, Pai } from '../../types/Mjai'
import {
  ActionAnGangAddGang, ActionBaBei,
  ActionChiPengGang, ActionDealTile, ActionDiscardTile, ActionHule, ActionNewRound, ActionNoTile,
  ActionPrototype, OptionalOperationList,
} from '../../types/ParsedMajsoulJSON'
import { majsoulChangToKaze, majsoulPaiListToMjai, majsoulPaiToMjai, sortPai } from '../../utils/pai'

export interface ActionToMjaiCtx {
  lastDahai?: { actor: number, pai: Pai }
}

export interface ActionToMjaiResult {
  events: MjaiEventList
  candidates: ActionCandidateList
  lastDahai?: { actor: number, pai: Pai }
}

function toConsumedList (combination: string[]): Pai[][] {
  return combination.map(s => majsoulPaiListToMjai(s.split('|')))
}

function actionToMjai (
  parsedMajsoulJSON: ActionPrototype,
  meSeat: number,
  ctx: ActionToMjaiCtx,
): ActionToMjaiResult {
  const parsedMsgList: MjaiEventList = []
  const actionCandidateList: ActionCandidateList = []
  let lastDahai = ctx.lastDahai

  if (parsedMajsoulJSON.data.name === 'ActionNewRound') {
    const actionData = parsedMajsoulJSON.data.data as ActionNewRound
    const sortedTiles = sortPai(majsoulPaiListToMjai(actionData.tiles))
    const oya = actionData.ju % actionData.scores.length

    parsedMsgList.push(
      {
        type: 'start_kyoku',
        bakaze: majsoulChangToKaze(actionData.chang),
        dora_marker: majsoulPaiToMjai(actionData.doras[0]),
        kyoku: actionData.ju + 1,
        honba: actionData.ben,
        kyotaku: actionData.liqibang,
        scores: actionData.scores,
        oya,
        tehais: Array.from({ length: 4 }).map((_, i) =>
          i === meSeat ? sortedTiles.slice(0, 13) : Array.from<Pai>({ length: 13 }).fill('?'),
        ),
      },
      {
        type: 'tsumo',
        pai: sortedTiles.length > 13 ? sortedTiles[13] : '?',
        actor: oya,
      },
    )
  }

  if (parsedMajsoulJSON.data.name === 'ActionAnGangAddGang') {
    const actionData = parsedMajsoulJSON.data.data as ActionAnGangAddGang
    const tile = majsoulPaiToMjai(actionData.tiles)
    if (actionData.type === 3) {
      parsedMsgList.push({ type: 'ankan', actor: actionData.seat, consumed: [tile, tile, tile, tile] })
      if (actionData.doras?.length) {
        parsedMsgList.push({ type: 'dora', dora_marker: majsoulPaiToMjai(actionData.doras.slice(-1)[0]) })
      }
    } else if (actionData.type === 4) {
      parsedMsgList.push({ type: 'kakan', actor: actionData.seat, pai: tile, consumed: [tile, tile, tile] })
      if (actionData.doras?.length) {
        parsedMsgList.push({ type: 'dora', dora_marker: majsoulPaiToMjai(actionData.doras.slice(-1)[0]) })
      }
    }
  }

  if (parsedMajsoulJSON.data.name === 'ActionChiPengGang') {
    const actionData = parsedMajsoulJSON.data.data as ActionChiPengGang
    const tiles = majsoulPaiListToMjai(actionData.tiles)
    if (actionData.type === 2) {
      parsedMsgList.push({
        type: 'daiminkan',
        actor: actionData.seat,
        target: actionData.froms.find(n => n !== actionData.seat) as number,
        pai: tiles[0],
        consumed: tiles.slice(0, 3),
      })
      if (actionData.doras?.length) {
        parsedMsgList.push({ type: 'dora', dora_marker: majsoulPaiToMjai(actionData.doras.slice(-1)[0]) })
      }
    } else if (actionData.type === 0) {
      const targetIndex = actionData.froms.findIndex(n => n !== actionData.seat)
      parsedMsgList.push({
        type: 'chi',
        actor: actionData.seat,
        target: actionData.froms[targetIndex],
        pai: tiles[targetIndex],
        consumed: tiles.filter((_, i) => actionData.froms[i] === actionData.seat),
      })
    } else if (actionData.type === 1) {
      parsedMsgList.push({
        type: 'pon',
        actor: actionData.seat,
        target: actionData.froms.find(n => n !== actionData.seat) as number,
        pai: tiles[0],
        consumed: tiles.slice(0, 2),
      })
    }
  }

  if (parsedMajsoulJSON.data.name === 'ActionBaBei') {
    const actionData = parsedMajsoulJSON.data.data as ActionBaBei
    parsedMsgList.push({ type: 'nuki', actor: actionData.seat })
  }

  if (parsedMajsoulJSON.data.name === 'ActionDealTile') {
    const actionData = parsedMajsoulJSON.data.data as ActionDealTile
    parsedMsgList.push({
      type: 'tsumo',
      actor: actionData.seat,
      pai: actionData.tile !== '' ? majsoulPaiToMjai(actionData.tile) : '?',
    })
    if (actionData.doras?.length) {
      parsedMsgList.push({ type: 'dora', dora_marker: majsoulPaiToMjai(actionData.doras.slice(-1)[0]) })
    }
  }

  if (parsedMajsoulJSON.data.name === 'ActionDiscardTile') {
    const actionData = parsedMajsoulJSON.data.data as ActionDiscardTile
    if (actionData.is_liqi || actionData.is_wliqi) {
      parsedMsgList.push({ type: 'reach', actor: actionData.seat })
    }
    const pai = majsoulPaiToMjai(actionData.tile)
    parsedMsgList.push({
      type: 'dahai',
      actor: actionData.seat,
      pai,
      tsumogiri: actionData.moqie,
    })
    lastDahai = { actor: actionData.seat, pai }
  }

  if (parsedMajsoulJSON.data.name === 'ActionHule') {
    const actionData = parsedMajsoulJSON.data.data as ActionHule
    for (const hule of actionData.hules) {
      parsedMsgList.push({
        type: 'hora',
        actor: hule.seat,
        target: hule.zimo ? undefined : lastDahai?.actor,
        pai: majsoulPaiToMjai(hule.hu_tile),
      })
    }
    parsedMsgList.push({ type: 'end_kyoku', scores: actionData.scores })
  }

  if (parsedMajsoulJSON.data.name === 'ActionLiuJu') {
    parsedMsgList.push({ type: 'ryukyoku' })
    parsedMsgList.push({ type: 'end_kyoku' })
  }

  if (parsedMajsoulJSON.data.name === 'ActionNoTile') {
    parsedMsgList.push({ type: 'ryukyoku', reason: 'haitei' })
    const actionData = parsedMajsoulJSON.data.data as ActionNoTile
    if (actionData.scores?.length) {
      parsedMsgList.push({
        type: 'end_kyoku',
        scores: actionData.scores.map(s => s.score),
      })
    } else {
      parsedMsgList.push({ type: 'end_kyoku' })
    }
  }

  if (
    /Action(NewRound|AnGangAddGang|BaBei|ChiPengGang|DealTile|DiscardTile)/.test(parsedMajsoulJSON.data.name) &&
    (parsedMajsoulJSON.data.data as { operation: OptionalOperationList | null }).operation !== null &&
    (parsedMajsoulJSON.data.data as { operation: OptionalOperationList }).operation.seat === meSeat &&
    (parsedMajsoulJSON.data.data as { operation: OptionalOperationList }).operation.operation_list.length > 0
  ) {
    const { operation_list: operationList } = (parsedMajsoulJSON.data.data as ActionNewRound |
    ActionAnGangAddGang | ActionBaBei | ActionChiPengGang | ActionDealTile | ActionDiscardTile).operation as OptionalOperationList
    for (const optionalOperation of operationList) {
      if (optionalOperation.type === 1) {
        actionCandidateList.push({ type: 'dahai' })
      } else if (optionalOperation.type === 2) {
        actionCandidateList.push({ type: 'chi', consumedList: toConsumedList(optionalOperation.combination) })
      } else if (optionalOperation.type === 3) {
        actionCandidateList.push({ type: 'pon', consumedList: toConsumedList(optionalOperation.combination) })
      } else if (optionalOperation.type === 4) {
        actionCandidateList.push({ type: 'ankan', consumedList: toConsumedList(optionalOperation.combination) })
      } else if (optionalOperation.type === 5) {
        actionCandidateList.push({ type: 'daiminkan', consumedList: toConsumedList(optionalOperation.combination) })
      } else if (optionalOperation.type === 6) {
        actionCandidateList.push({ type: 'kakan', consumedList: toConsumedList(optionalOperation.combination) })
      } else if (optionalOperation.type === 7) {
        actionCandidateList.push({
          type: 'reach',
          pais: majsoulPaiListToMjai(Array.from(new Set(optionalOperation.combination))),
        })
      } else if (optionalOperation.type === 8) {
        actionCandidateList.push({ type: 'hora', tsumo: true })
      } else if (optionalOperation.type === 9) {
        actionCandidateList.push({ type: 'hora' })
      } else if (optionalOperation.type === 10) {
        actionCandidateList.push({ type: 'ryukyoku' })
      } else if (optionalOperation.type === 11) {
        actionCandidateList.push({ type: 'nuki' })
      }
    }
  }

  return { events: parsedMsgList, candidates: actionCandidateList, lastDahai }
}

export { actionToMjai }
