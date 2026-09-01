import structuredClone from '@ungap/structured-clone'

import logger from '../../logger'
import type { ActionCandidateList, MjaiEventList } from '../../types/Mjai'
import { ParsedTenhouJSON } from '../../types/ParsedTenhouJSON'
import { tenhouNumToMjai, tenhouSeedToKaze } from '../../utils/pai'

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
      hai: originalJSON.hai.split(',').map((s: string) => +s),
    }
  }
  if (originalJSON.tag === 'DORA') {
    return { tag: 'DORA', hai: +originalJSON.hai }
  }
  if (originalJSON.tag === 'REACH') {
    return {
      tag: 'REACH',
      step: +originalJSON.step,
      who: +originalJSON.who,
      ten: originalJSON.ten.split(',').map((s: string) => +s * 100),
    }
  }
  if (originalJSON.tag === 'AGARI') {
    return { tag: 'AGARI', who: +originalJSON.who, fromWho: +originalJSON.fromWho }
  }
  if (originalJSON.tag === 'N') {
    return { tag: 'N', who: +originalJSON.who, m: +originalJSON.m }
  }
  if (/(T|U|V|W|t|u|v|w)\d*/.test(originalJSON.tag)) {
    return {
      tag: originalJSON.tag[0].toUpperCase(),
      hai: originalJSON.tag.length > 1 ? +originalJSON.tag.slice(1) : undefined,
    }
  }
  if (/(D|E|F|G|d|e|f|g)\d+/.test(originalJSON.tag)) {
    return {
      tag: originalJSON.tag[0].toUpperCase(),
      hai: +originalJSON.tag.slice(1),
    }
  }
  if (originalJSON.tag === 'RYUUKYOKU') {
    return { tag: 'RYUUKYOKU', type: originalJSON.type }
  }

  return null
}

function parseRes (
  binaryMsg: Buffer,
): [MjaiEventList, ActionCandidateList] {
  const parsedTenhouJSON = parseTenhouJSON(binaryMsg)
  logger.info(
    `<parser> parsed ResMsg Buffer to JSON(tenhou): ${JSON.stringify(structuredClone(parsedTenhouJSON))}`,
  )

  if (parsedTenhouJSON === null) {
    return [[], []]
  }

  const parsedMsgList: MjaiEventList = []
  const actionCandidateList: ActionCandidateList = []

  if (parsedTenhouJSON.tag === 'GO') {
    parsedMsgList.push({ type: 'start_game', id: 0 })
  }

  if (parsedTenhouJSON.tag === 'INIT') {
    parsedMsgList.push({
      type: 'start_kyoku',
      bakaze: tenhouSeedToKaze(parsedTenhouJSON.seed[0]),
      dora_marker: tenhouNumToMjai(parsedTenhouJSON.seed[5]),
      kyoku: parsedTenhouJSON.seed[0] + 1,
      honba: parsedTenhouJSON.seed[1],
      kyotaku: parsedTenhouJSON.seed[2],
      scores: parsedTenhouJSON.ten,
      oya: parsedTenhouJSON.oya,
      tehais: [
        parsedTenhouJSON.hai.map(num => tenhouNumToMjai(num)),
        Array.from({ length: 13 }).map(() => '?' as const),
        Array.from({ length: 13 }).map(() => '?' as const),
        Array.from({ length: 13 }).map(() => '?' as const),
      ],
    })
  }

  if (parsedTenhouJSON.tag === 'DORA') {
    parsedMsgList.push({
      type: 'dora',
      dora_marker: tenhouNumToMjai(parsedTenhouJSON.hai),
    })
  }

  if (parsedTenhouJSON.tag === 'REACH' && parsedTenhouJSON.step === 2) {
    parsedMsgList.push({ type: 'reach', actor: parsedTenhouJSON.who })
  }

  if (parsedTenhouJSON.tag === 'AGARI') {
    parsedMsgList.push({
      type: 'hora',
      actor: parsedTenhouJSON.who,
      target: parsedTenhouJSON.fromWho,
    })
    parsedMsgList.push({ type: 'end_kyoku' })
  }

  if (parsedTenhouJSON.tag === 'RYUUKYOKU') {
    parsedMsgList.push({ type: 'ryukyoku' })
    parsedMsgList.push({ type: 'end_kyoku' })
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
      pai: parsedTenhouJSON.hai !== undefined ? tenhouNumToMjai(parsedTenhouJSON.hai) : '?',
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
      pai: tenhouNumToMjai(parsedTenhouJSON.hai),
      tsumogiri: false,
    })
  }

  return [parsedMsgList, actionCandidateList]
}

export { parseRes }
