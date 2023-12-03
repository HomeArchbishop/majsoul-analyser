import { Root, AnyNestedObject } from 'protobufjs'
import liqi from './liqi'
import { ParsedMajsoulJSON, ActionPrototype, ActionNewRound, ActionAnGangAddGang, ActionChiPengGang, ActionBaBei, ActionDealTile, ActionDiscardTile, OptionalOperationList } from '../types/ParsedMajsoulJSON'
import { ParsedMsgList } from '../types/ParsedMsg'
import { ParsedRoughOperationList } from '../types/ParsedOperation'
import { sortTiles } from '../utils/sortTiles'
import { Tile } from '../types/General'
import logger from '../logger'
import structuredClone from '@ungap/structured-clone'

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
      // 2023年初，雀魂在 protobuf 的 ActionPrototype 中加入了下方的混淆
      const keys = [0x84, 0x5e, 0x4e, 0x42, 0x39, 0xa2, 0x1f, 0x60, 0x1c]
      for (let i = 0; i < parsedMajsoulJSON.data.data.length; i++) {
        const u = (23 ^ parsedMajsoulJSON.data.data.length) + 5 * i + keys[i % keys.length] & 255
        parsedMajsoulJSON.data.data[i] ^= u
      }
      // if this err happens, it will kill the whole process. I did it intendly
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
      // => resName === eg. 'ResSyncGame'
      parsedMsg.data = root.lookupType('.lq.' + resName).decode(data)
      switch (resName) {
        case 'ResSyncGame':
          if (Array.isArray(parsedMsg.data.game_restore?.actions)) {
            (parsedMsg.data.game_restore.actions).forEach(({ name: actionName, data }, index, list) => {
              list[index].data = root.lookupType(actionName as string).decode(data as Uint8Array)
            })
          }
          break
        case 'ResAuthGame':
          break
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

function parseResBufferMsg (
  binaryMsg: Buffer,
  reqQueueMajsoul: Readonly<Record<number, { resName: string }>>, options: { meID?: string, meSeat?: number }): [ParsedMsgList, ParsedRoughOperationList] {
  const parsedMajsoulJSON = parseMajsoulJSON(binaryMsg, reqQueueMajsoul)
  logger.info(`<parser> parsed ResMsg Buffer to JSON(majsoul): ${JSON.stringify(structuredClone(parsedMajsoulJSON))}`)
  if (parsedMajsoulJSON === null) { return [[], []] }

  const parsedMsgList: ParsedMsgList = []
  const parsedRoughOperationList: ParsedRoughOperationList = []

  if (parsedMajsoulJSON.name === 'ResAuthGame') { /* 整场游戏开始 */
    if (parsedMajsoulJSON.data.error !== null && parsedMajsoulJSON.data.error !== undefined) { return [parsedMsgList, parsedRoughOperationList] } /* 对局游戏故障或已结束（from雀魂服务端） */
    if (parsedMajsoulJSON.data.seat_list.length < 1) { return [parsedMsgList, parsedRoughOperationList] } /* 多余的一次请求（雀魂有时会在有效ResAuthGame请求后再次请求, 得到空resp */
    const meSeatID = parsedMajsoulJSON.data.seat_list.findIndex(id => String(id) === options.meID)
    options.meSeat = meSeatID
    parsedMsgList.push({ type: 'start_game', id: meSeatID })
  }
  if (parsedMajsoulJSON.name === 'NotifyGameTerminate') { /* 整场游戏结束 */
    parsedMsgList.push({ type: 'end_game' })
  }

  /* BEGIN: msgJSONs which require meSeat */
  if (options.meSeat === undefined || options.meSeat === -1) { return [parsedMsgList, parsedRoughOperationList] }
  if (parsedMajsoulJSON.name === 'ActionPrototype') { /* 单个 ActionPrototype msg */
    const [msgList, operationList] = parsehandleActionPrototypeMsgJSON(parsedMajsoulJSON, options.meSeat)
    parsedMsgList.push(...msgList)
    parsedRoughOperationList.push(...operationList)
  }
  if (
    parsedMajsoulJSON.name === 'ResSyncGame' &&
    parsedMajsoulJSON.data.game_restore !== undefined &&
    parsedMajsoulJSON.data.game_restore !== null &&
    !parsedMajsoulJSON.data.is_end
  ) { /* 重回牌桌的同步消息, 含 ActionPrototype msg 队列 */
    for (const action of parsedMajsoulJSON.data.game_restore.actions) {
      const [msgList, operationList] = parsehandleActionPrototypeMsgJSON({ name: 'ActionPrototype', data: action }, options.meSeat)
      parsedMsgList.push(...msgList)
      parsedRoughOperationList.length = 0
      parsedRoughOperationList.push(...operationList)
    }
  }
  /* NED: msgJSONs which require meSeat */

  return [parsedMsgList, parsedRoughOperationList]
}

/**
 * 解析雀魂 ActionPrototype 消息 JSON
 */
function parsehandleActionPrototypeMsgJSON (parsedMajsoulJSON: ActionPrototype, meSeat: number): [ParsedMsgList, ParsedRoughOperationList] {
  const parsedMsgList: ParsedMsgList = []
  const parsedRoughOperationList: ParsedRoughOperationList = []

  /* ========================= */
  /*     ActionNewRound消息    */
  /* ========================= */
  if (parsedMajsoulJSON.data.name === 'ActionNewRound') { /* 新一轮(round)开始 */
    const actionData = parsedMajsoulJSON.data.data as ActionNewRound
    const sortedTiles = sortTiles(actionData.tiles)

    const oya = actionData.ju % actionData.scores.length

    parsedMsgList.push(
      { /* TODO: May have mistakes when calculate under 3-player mahjong */
        type: 'start_kyoku',
        bakaze: `${actionData.chang + 1}z` as '1z' | '2z' | '3z' | '4z',
        dora_marker: actionData.doras[0],
        kyoku: actionData.ju,
        honba: actionData.ben,
        kyotaku: 1000,
        scores: actionData.scores,
        oya,
        tehais: Array.from({ length: 4 }).map((_, i) => i === meSeat ? sortedTiles.slice(0, 13) : Array.from<'?'>({ length: 13 }).fill('?'))
      },
      { type: 'tsumo', pai: sortedTiles.length > 13 ? sortedTiles[13] : '?', actor: oya }
    )
  }
  /* ======================== */
  /*     一般流程Action消息    */
  /* ======================== */
  if (parsedMajsoulJSON.data.name === 'ActionAnGangAddGang') { /* ActionAnGangAddGang */
    const actionData = parsedMajsoulJSON.data.data as ActionAnGangAddGang
    if (actionData.type === 3) { /* 暗杠 */
      parsedMsgList.push(
        {
          type: 'ankan',
          actor: actionData.seat,
          consumed: [actionData.tiles, actionData.tiles, actionData.tiles, actionData.tiles]
        }
      )
      if (actionData.doras !== undefined && actionData.doras.length !== 0) {
        parsedMsgList.push({
          type: 'dora',
          dora_marker: actionData.doras.slice(-1)[0]
        })
      }
    } else if (actionData.type === 4) { /* 加杠 */
      parsedMsgList.push(
        {
          type: 'kakan',
          actor: actionData.seat,
          pai: actionData.tiles,
          consumed: [actionData.tiles, actionData.tiles, actionData.tiles]
        }
      )
      if (actionData.doras !== undefined && actionData.doras.length !== 0) {
        parsedMsgList.push({
          type: 'dora',
          dora_marker: actionData.doras.slice(-1)[0]
        })
      }
    }
  }
  if (parsedMajsoulJSON.data.name === 'ActionChiPengGang') { /* ActionChiPengGang */
    const actionData = parsedMajsoulJSON.data.data as ActionChiPengGang
    if (actionData.type === 2) { /* 明杠 */
      parsedMsgList.push(
        {
          type: 'daiminkan',
          actor: actionData.seat,
          target: actionData.froms.find(n => n !== actionData.seat) as number,
          pai: actionData.tiles[0],
          consumed: actionData.tiles.slice(0, 3)
        }
      )
      if (actionData.doras !== undefined && actionData.doras.length !== 0) {
        parsedMsgList.push({
          type: 'dora',
          dora_marker: actionData.doras.slice(-1)[0]
        })
      }
    } else if (actionData.type === 0) { /* 吃 */
      const targetIndex = actionData.froms.findIndex(n => n !== actionData.seat)
      parsedMsgList.push(
        {
          type: 'chi',
          actor: actionData.seat,
          target: actionData.froms[targetIndex],
          pai: actionData.tiles[targetIndex],
          consumed: actionData.tiles.reduce<Tile[]>((p, c, i) => {
            if (i === actionData.seat) { p.push(c) }; return p
          }, [])
        }
      )
    } else if (actionData.type === 1) { /* 碰 */
      parsedMsgList.push(
        {
          type: 'pon',
          actor: actionData.seat,
          target: actionData.froms.find(n => n !== actionData.seat) as number,
          pai: actionData.tiles[0],
          consumed: actionData.tiles.slice(0, 2)
        }
      )
    }
  }
  if (parsedMajsoulJSON.data.name === 'ActionBaBei') { /* ActionBaBei */
    const actionData = parsedMajsoulJSON.data.data as ActionBaBei
    parsedMsgList.push({ type: 'babei', actor: actionData.seat })
  }
  if (parsedMajsoulJSON.data.name === 'ActionDealTile') { /* ActionDealTile */
    const actionData = parsedMajsoulJSON.data.data as ActionDealTile
    parsedMsgList.push({
      type: 'tsumo',
      actor: actionData.seat,
      pai: actionData.tile !== '' ? actionData.tile : '?'
    })
    if (actionData.doras !== undefined && actionData.doras.length !== 0) {
      parsedMsgList.push({
        type: 'dora',
        dora_marker: actionData.doras.slice(-1)[0]
      })
    }
  }
  if (parsedMajsoulJSON.data.name === 'ActionDiscardTile') { /* ActionDiscardTile */
    const actionData = parsedMajsoulJSON.data.data as ActionDiscardTile
    if (actionData.is_liqi || actionData.is_wliqi) {
      parsedMsgList.push({
        type: 'reach',
        actor: actionData.seat
      })
    }
    parsedMsgList.push({
      type: 'dahai',
      actor: actionData.seat,
      pai: actionData.tile,
      tsumogiri: actionData.moqie
    })
  }
  /* =========== */
  /*     rest    */
  /* =========== */

  /* ==================== */
  /*    处理 Operation    */
  /* ==================== */
  if (
    /Action(NewRound|AnGangAddGang|BaBei|ChiPengGang|DealTile|DiscardTile)/.test(parsedMajsoulJSON.data.name) &&
    (parsedMajsoulJSON.data.data as { operation: OptionalOperationList | null }).operation !== null &&
    (parsedMajsoulJSON.data.data as { operation: OptionalOperationList }).operation.seat === meSeat &&
    (parsedMajsoulJSON.data.data as { operation: OptionalOperationList }).operation.operation_list.length > 0
  ) {
    const { operation_list: operationList } = (parsedMajsoulJSON.data.data as ActionNewRound |
    ActionAnGangAddGang |
    ActionBaBei |
    ActionChiPengGang |
    ActionDealTile |
    ActionDiscardTile).operation as OptionalOperationList
    for (const optionalOperation of operationList) {
      // discard: 1, chi: 2, peng: 3, angang: 4, gang: 5, addgang: 6,
      // liqi: 7, zimo: 8, hule(ron): 9, jiuzhongjiupai: 10, babei: 11
      if (optionalOperation.type === 1) { /* discard */
        parsedRoughOperationList.push({ type: 'dahai' })
      } else if (optionalOperation.type === 2) { /* chi */
        parsedRoughOperationList.push({ type: 'chi', consumedList: optionalOperation.combination.map<Tile[]>(s => s.split('|') as Tile[]) })
      } else if (optionalOperation.type === 3) { /* peng */
        parsedRoughOperationList.push({ type: 'pon', consumedList: optionalOperation.combination.map<Tile[]>(s => s.split('|') as Tile[]) })
      } else if (optionalOperation.type === 4) { /* angang */
        parsedRoughOperationList.push({ type: 'ankan', consumedList: optionalOperation.combination.map<Tile[]>(s => s.split('|') as Tile[]) })
      } else if (optionalOperation.type === 5) { /* gang */
        parsedRoughOperationList.push({ type: 'daiminkan', consumedList: optionalOperation.combination.map<Tile[]>(s => s.split('|') as Tile[]) })
      } else if (optionalOperation.type === 6) { /* addgang */
        parsedRoughOperationList.push({ type: 'kakan', consumedList: optionalOperation.combination.map<Tile[]>(s => s.split('|') as Tile[]) })
      } else if (optionalOperation.type === 7) { /* liqi */
        parsedRoughOperationList.push({ type: 'reach', pais: Array.from(new Set(optionalOperation.combination)) as Tile[] })
      } else if (optionalOperation.type === 8) { /* zimo */
        parsedRoughOperationList.push({ type: 'horatsumo' })
      } else if (optionalOperation.type === 9) { /* ron */
        parsedRoughOperationList.push({ type: 'horaron' })
      } else if (optionalOperation.type === 10) { /* jiuzhongjiupai */
        parsedRoughOperationList.push({ type: 'ryukyoku' })
      } else if (optionalOperation.type === 11) { /* babei */
        parsedRoughOperationList.push({ type: 'babei' })
      }
    }
  }

  return [parsedMsgList, parsedRoughOperationList]
}

export { parseResBufferMsg }
