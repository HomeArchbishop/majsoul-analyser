import { ParsedMsgList } from '../types/ParsedMsg'
import { ParsedRoughOperationList } from '../types/ParsedOperation'
// import { sortTiles } from '../utils/sortTiles'
// import { Tile } from '../types/General'
import logger from '../logger'
import structuredClone from '@ungap/structured-clone'
import { ParsedTenhouJSON } from '../types/ParsedTenhouJSON'
import { tenhouNum2Tile } from '../utils/tenhouNum2Tile'

function parseTenhouJSON (binaryMsg: Buffer): ParsedTenhouJSON | null {
  const text = binaryMsg.toString()
  if (text.startsWith('<')) {
    return null
  }
  const originalJSON = JSON.parse(binaryMsg.toString())

  if (originalJSON.tag === 'GO') {
    return { tag: 'GO' }
  }
  if (originalJSON.tag === 'INIT') {
    return {
      tag: 'INIT',
      seed: originalJSON.seed.split(',').map((s: string) => +s),
      ten: originalJSON.ten.split(',').map((s: string) => +s * 100),
      oya: +originalJSON.oya,
      hai: originalJSON.hai.split(',').map((s: string) => +s)
    }
  }
  if (originalJSON.tag === 'DORA') {
    return {
      tag: 'DORA',
      hai: +originalJSON.hai
    }
  }
  if (originalJSON.tag === 'REACH') {
    return {
      tag: 'REACH',
      step: +originalJSON.step,
      who: +originalJSON.who,
      ten: originalJSON.ten.split(',').map((s: string) => +s * 100)
    }
  }
  if (originalJSON.tag === 'AGARI') {
    return {
      tag: 'AGARI',
      who: +originalJSON.who,
      fromWho: +originalJSON.fromWho
    }
  }
  if (originalJSON.tag === 'N') {
    return {
      tag: 'N',
      who: +originalJSON.who,
      m: +originalJSON.m
    }
  }
  if (/(T|U|V|W|t|u|v|w)\d*/.test(originalJSON.tag)) {
    return {
      tag: originalJSON.tag[0].toUpperCase(),
      hai: originalJSON.tag.length > 1 ? +originalJSON.tag.slice(1) : undefined
    }
  }
  if (/(D|E|F|G|d|e|f|g)\d+/.test(originalJSON.tag)) {
    return {
      tag: originalJSON.tag[0].toUpperCase(),
      hai: +originalJSON.tag.slice(1)
    }
  }
  if (originalJSON.tag === 'RYUUKYOKU') {
    return {
      tag: 'RYUUKYOKU',
      type: originalJSON.type
    }
  }

  return null
}

function parseResBufferMsg (binaryMsg: Buffer): [ParsedMsgList, ParsedRoughOperationList] {
  const parsedTenhouJSON = parseTenhouJSON(binaryMsg)
  logger.info(
    `<parser> parsed ResMsg Buffer to JSON(tenhou): ${JSON.stringify(
      structuredClone(parsedTenhouJSON)
    )}`
  )

  if (parsedTenhouJSON === null) {
    return [[], []]
  }

  const parsedMsgList: ParsedMsgList = []
  const parsedRoughOperationList: ParsedRoughOperationList = []

  /* ==================== */
  /*     parsedMsgList    */
  /* ==================== */
  if (parsedTenhouJSON.tag === 'GO') {
    parsedMsgList.push({ type: 'start_game', id: 0 })
  }

  if (parsedTenhouJSON.tag === 'INIT') {
    parsedMsgList.push({
      type: 'start_kyoku',
      bakaze: `${((~~(parsedTenhouJSON.seed[0] / 4) - 1) % 4) + 1}z` as
        | '1z'
        | '2z'
        | '3z'
        | '4z',
      dora_marker: tenhouNum2Tile(parsedTenhouJSON.seed[5]),
      kyoku: parsedTenhouJSON.seed[0] + 1,
      honba: parsedTenhouJSON.seed[1],
      kyotaku: parsedTenhouJSON.seed[2],
      scores: parsedTenhouJSON.ten,
      oya: parsedTenhouJSON.oya,
      tehais: [
        parsedTenhouJSON.hai.map(num => tenhouNum2Tile(num)),
        Array.from({ length: 13 }).map(() => '?'),
        Array.from({ length: 13 }).map(() => '?'),
        Array.from({ length: 13 }).map(() => '?')
      ]
    })
  }

  if (parsedTenhouJSON.tag === 'DORA') {
    parsedMsgList.push({
      type: 'dora',
      dora_marker: tenhouNum2Tile(parsedTenhouJSON.hai)
    })
  }

  if (parsedTenhouJSON.tag === 'REACH' && parsedTenhouJSON.step === 2) {
    parsedMsgList.push({
      type: 'reach',
      actor: parsedTenhouJSON.who
    })
  }

  if (parsedTenhouJSON.tag === 'N') {
    // TODO: unknown N.m meaning
  }

  if (
    parsedTenhouJSON.tag === 'T' ||
    parsedTenhouJSON.tag === 'U' ||
    parsedTenhouJSON.tag === 'V' ||
    parsedTenhouJSON.tag === 'W'
  ) {
    parsedMsgList.push({
      type: 'tsumo',
      actor: ['T', 'U', 'V', 'W'].indexOf(parsedTenhouJSON.tag),
      pai:
        parsedTenhouJSON.hai !== undefined
          ? tenhouNum2Tile(parsedTenhouJSON.hai)
          : '?'
    })
  }

  if (
    parsedTenhouJSON.tag === 'D' ||
    parsedTenhouJSON.tag === 'E' ||
    parsedTenhouJSON.tag === 'F' ||
    parsedTenhouJSON.tag === 'G'
  ) {
    parsedMsgList.push({
      type: 'dahai',
      actor: ['D', 'E', 'F', 'G'].indexOf(parsedTenhouJSON.tag),
      pai: tenhouNum2Tile(parsedTenhouJSON.hai),
      tsumogiri: false // FIXME: cannot determine
    })
  }

  /* =============================== */
  /*     parsedRoughOperationList    */
  /* =============================== */

  return [parsedMsgList, parsedRoughOperationList]
}

export { parseResBufferMsg }
