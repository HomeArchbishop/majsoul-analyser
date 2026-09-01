import structuredClone from '@ungap/structured-clone'
import { AnyNestedObject, Root } from 'protobufjs'

import logger from '../logger'
import type { ActionCandidateList } from '../types/Mjai'
import { MjaiEventList, Pai } from '../types/Mjai'
import {
  ActionAnGangAddGang, ActionBaBei,
  ActionChiPengGang, ActionDealTile, ActionDiscardTile, ActionHule, ActionNewRound, ActionNoTile,
  ActionPrototype, OptionalOperationList, ParsedMajsoulJSON,
  ResAuthGame,
} from '../types/ParsedMajsoulJSON'
import { majsoulChangToKaze, majsoulPaiListToMjai, majsoulPaiToMjai, sortPai } from '../utils/pai'
import liqi from './liqi'

export interface MajsoulParseOptions {
  meID?: string
  meSeat?: number
  lastDahai?: { actor: number, pai: Pai }
  /** ResAuthGame 未能解析座位时为 true，等待后续私有动作推断 */
  awaitingMeSeat?: boolean
  /** 在座位未知时缓存的 ActionNewRound，座位确定后再解析 */
  pendingActionNewRound?: ActionPrototype
}

function parseMajsoulJSON (binaryMsg: Buffer, reqQueueMajsoul: Readonly<Record<number, { resName: string }>>): ParsedMajsoulJSON | null {
  const binaryMsgArr = new Uint8Array(binaryMsg)

  const msgType = { notify: 1, req: 2, res: 3 }
  const root = Root.fromJSON(liqi as AnyNestedObject)
  const wrapper = root.lookupType('Wrapper')
  interface DecodeMsg { data: Uint8Array, name: string }
  if (binaryMsgArr[0] === msgType.notify) {
    const { name, data } = wrapper.decode(binaryMsgArr.slice(1)) as unknown as DecodeMsg
    const parsedMajsoulJSON: any = { data: {}, name: name.slice(4) as ParsedMajsoulJSON['name'] }
    try {
      parsedMajsoulJSON.data = root.lookupType(name).decode(data)
    } catch (e) {
      return null
    }
    if (parsedMajsoulJSON.name === 'ActionPrototype') {
      const keys = [0x84, 0x5e, 0x4e, 0x42, 0x39, 0xa2, 0x1f, 0x60, 0x1c]
      for (let i = 0; i < parsedMajsoulJSON.data.data.length; i++) {
        const u = (23 ^ parsedMajsoulJSON.data.data.length) + 5 * i + keys[i % keys.length] & 255
        parsedMajsoulJSON.data.data[i] ^= u
      }
      parsedMajsoulJSON.data.data = root.lookupType(parsedMajsoulJSON.data.name).decode(parsedMajsoulJSON.data.data as Uint8Array)
    }
    return parsedMajsoulJSON
  }
  if (binaryMsgArr[0] === msgType.res) {
    try {
      const index = (binaryMsgArr[2] << 8) + binaryMsgArr[1]
      const resName = reqQueueMajsoul[index]?.resName
      if (resName === undefined) { return null }
      const { data } = wrapper.decode(binaryMsgArr.slice(3)) as unknown as DecodeMsg
      const parsedMsg: any = { data: {}, name: resName as ParsedMajsoulJSON['name'] }
      parsedMsg.data = root.lookupType('.lq.' + resName).decode(data)
      switch (resName) {
        case 'ResSyncGame':
          if (Array.isArray(parsedMsg.data.game_restore?.actions)) {
            type SyncGameActionWire = { name: string, data: Uint8Array | object }
            ;(parsedMsg.data.game_restore.actions as SyncGameActionWire[]).forEach(
              ({ name: actionName, data }, index, list) => {
                list[index].data = root.lookupType(actionName).decode(data as Uint8Array)
              },
            )
          }
          break
        case 'ResAuthGame':
        case 'ResLogin':
          break
        default:
          return null
      }
      return parsedMsg
    } catch (e) {
      console.error(e)
      return null
    }
  }
  return null
}

function resolveMeSeatAndID (
  data: ResAuthGame['data'],
  meID?: string,
): { meSeat: number, meID: string } {
  const seatList = data.seat_list

  if (meID !== undefined && meID.length > 0) {
    const meSeat = seatList.findIndex(id => String(id) === meID)
    if (meSeat !== -1) { return { meSeat, meID } }
  }

  // 人机/好友房常见：players 只带自己
  if (data.players.length === 1) {
    const accountId = String(data.players[0].account_id)
    const meSeat = seatList.findIndex(id => String(id) === accountId)
    if (meSeat !== -1) { return { meSeat, meID: accountId } }
  }

  // 三机器人一真人
  const humanSeats = seatList
    .map((id, idx) => ({ id, idx }))
    .filter(({ id }) => id !== 0)
  if (humanSeats.length === 1) {
    return { meSeat: humanSeats[0].idx, meID: String(humanSeats[0].id) }
  }

  // 段位场等四人真人：无法从 ResAuthGame 单独判断，返回 -1 交给后续私有动作推断
  return { meSeat: -1, meID: meID ?? '' }
}

/**
 * 从「仅对本机有意义」的字段推断自己的座位（段位场无 meID 时的关键路径）。
 * - 手牌 14 张的 ActionNewRound → 自己是庄
 * - ActionDealTile.tile 非空 → 自己在摸牌
 * - operation 非空 → 雀魂只给本机填操作列表
 */
function inferMeSeatFromAction (action: ActionPrototype): number | undefined {
  const { name, data } = action.data

  if (name === 'ActionNewRound') {
    const round = data as ActionNewRound
    if (round.tiles.length >= 14) {
      return round.ju % round.scores.length
    }
    if (round.operation !== null && round.operation !== undefined) {
      return round.operation.seat
    }
  }

  if (name === 'ActionDealTile') {
    const deal = data as ActionDealTile
    if (deal.tile !== '') { return deal.seat }
  }

  const withOp = data as { operation?: OptionalOperationList | null }
  if (withOp.operation !== null && withOp.operation !== undefined) {
    return withOp.operation.seat
  }

  return undefined
}

function toConsumedList (combination: string[]): Pai[][] {
  return combination.map(s => majsoulPaiListToMjai(s.split('|')))
}

function parsehandleActionPrototypeMsgJSON (
  parsedMajsoulJSON: ActionPrototype,
  meSeat: number,
  options: MajsoulParseOptions,
): [MjaiEventList, ActionCandidateList] {
  const parsedMsgList: MjaiEventList = []
  const actionCandidateList: ActionCandidateList = []

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
    options.lastDahai = { actor: actionData.seat, pai }
  }

  if (parsedMajsoulJSON.data.name === 'ActionHule') {
    const actionData = parsedMajsoulJSON.data.data as ActionHule
    for (const hule of actionData.hules) {
      parsedMsgList.push({
        type: 'hora',
        actor: hule.seat,
        target: hule.zimo ? undefined : options.lastDahai?.actor,
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

  return [parsedMsgList, actionCandidateList]
}

function parseResBufferMsg (
  binaryMsg: Buffer,
  reqQueueMajsoul: Readonly<Record<number, { resName: string }>>,
  options: MajsoulParseOptions,
): [MjaiEventList, ActionCandidateList] {
  const parsedMajsoulJSON = parseMajsoulJSON(binaryMsg, reqQueueMajsoul)
  logger.info(`<parser> parsed ResMsg Buffer to JSON(majsoul): ${JSON.stringify(structuredClone(parsedMajsoulJSON))}`)
  if (parsedMajsoulJSON === null) { return [[], []] }

  const parsedMsgList: MjaiEventList = []
  const actionCandidateList: ActionCandidateList = []

  if (parsedMajsoulJSON.name === 'ResLogin') {
    if (parsedMajsoulJSON.data.account_id !== undefined) {
      options.meID = String(parsedMajsoulJSON.data.account_id)
    }
    return [parsedMsgList, actionCandidateList]
  }

  if (parsedMajsoulJSON.name === 'ResAuthGame') {
    if (parsedMajsoulJSON.data.error !== null && parsedMajsoulJSON.data.error !== undefined) { return [parsedMsgList, actionCandidateList] }
    if (parsedMajsoulJSON.data.seat_list.length < 1) { return [parsedMsgList, actionCandidateList] }
    const { meSeat, meID } = resolveMeSeatAndID(parsedMajsoulJSON.data, options.meID)
    options.meID = meID
    if (meSeat !== -1) {
      options.meSeat = meSeat
      options.awaitingMeSeat = false
      options.pendingActionNewRound = undefined
      parsedMsgList.push({ type: 'start_game', id: meSeat })
    } else {
      // 段位场四人真人且客户端未带 meID：延后到私有动作再 start_game
      options.meSeat = undefined
      options.awaitingMeSeat = true
      logger.info('<parser> ResAuthGame: meSeat unresolved (ranked?). Will infer from later actions.')
    }
  }
  if (parsedMajsoulJSON.name === 'NotifyGameTerminate') {
    parsedMsgList.push({ type: 'end_game' })
    options.awaitingMeSeat = false
    options.pendingActionNewRound = undefined
  }

  if (parsedMajsoulJSON.name === 'ActionPrototype') {
    const known = options.meSeat !== undefined && options.meSeat !== -1
    if (!known) {
      const inferred = inferMeSeatFromAction(parsedMajsoulJSON)
      if (inferred === undefined) {
        if (parsedMajsoulJSON.data.name === 'ActionNewRound') {
          options.pendingActionNewRound = parsedMajsoulJSON
          options.awaitingMeSeat = true
          logger.info('<parser> buffer ActionNewRound until meSeat is known')
        }
        return [parsedMsgList, actionCandidateList]
      }
      options.meSeat = inferred
      options.awaitingMeSeat = false
      parsedMsgList.push({ type: 'start_game', id: inferred })
      logger.info(`<parser> inferred meSeat=${inferred} from ${parsedMajsoulJSON.data.name}`)

      if (
        options.pendingActionNewRound !== undefined &&
        options.pendingActionNewRound !== parsedMajsoulJSON
      ) {
        const [msgList, candidates] = parsehandleActionPrototypeMsgJSON(
          options.pendingActionNewRound, inferred, options,
        )
        parsedMsgList.push(...msgList)
        actionCandidateList.push(...candidates)
        options.pendingActionNewRound = undefined
      }
    }

    const meSeat = options.meSeat as number
    const [msgList, candidates] = parsehandleActionPrototypeMsgJSON(parsedMajsoulJSON, meSeat, options)
    parsedMsgList.push(...msgList)
    actionCandidateList.length = 0
    actionCandidateList.push(...candidates)
  }

  if (
    parsedMajsoulJSON.name === 'ResSyncGame' &&
    parsedMajsoulJSON.data.game_restore !== undefined &&
    parsedMajsoulJSON.data.game_restore !== null &&
    !parsedMajsoulJSON.data.is_end
  ) {
    // 重连：从 restore 流里推断座位
    if (options.meSeat === undefined || options.meSeat === -1) {
      for (const action of parsedMajsoulJSON.data.game_restore.actions) {
        const inferred = inferMeSeatFromAction({ name: 'ActionPrototype', data: action })
        if (inferred !== undefined) {
          options.meSeat = inferred
          options.awaitingMeSeat = false
          parsedMsgList.push({ type: 'start_game', id: inferred })
          break
        }
      }
    }
    if (options.meSeat === undefined || options.meSeat === -1) {
      logger.info('<parser> ResSyncGame: still cannot resolve meSeat')
      return [parsedMsgList, actionCandidateList]
    }
    for (const action of parsedMajsoulJSON.data.game_restore.actions) {
      const [msgList, candidates] = parsehandleActionPrototypeMsgJSON(
        { name: 'ActionPrototype', data: action }, options.meSeat, options,
      )
      parsedMsgList.push(...msgList)
      actionCandidateList.length = 0
      actionCandidateList.push(...candidates)
    }
  }

  return [parsedMsgList, actionCandidateList]
}

export { parseResBufferMsg }
