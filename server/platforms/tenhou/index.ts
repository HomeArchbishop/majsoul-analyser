import structuredClone from '@ungap/structured-clone'

import logger from '../../logger'
import type { ActionCandidateList, MjaiEventList } from '../../types/Mjai'
import { ParsedTenhouJSON } from '../../types/ParsedTenhouJSON'
import type { Platform, PlatformProcessResult, PlatformSession, WireParseResult } from '../types'
import { numToMjai, seedToKaze } from './pai'

function decodeWire (binaryMsg: Buffer): ParsedTenhouJSON | null {
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

function wireToMjai (wire: ParsedTenhouJSON): WireParseResult {
  const events: MjaiEventList = []
  const candidates: ActionCandidateList = []

  if (wire.tag === 'GO') {
    events.push({ type: 'start_game', id: 0 })
  }

  if (wire.tag === 'INIT') {
    events.push({
      type: 'start_kyoku',
      bakaze: seedToKaze(wire.seed[0]),
      dora_marker: numToMjai(wire.seed[5]),
      kyoku: wire.seed[0] + 1,
      honba: wire.seed[1],
      kyotaku: wire.seed[2],
      scores: wire.ten,
      oya: wire.oya,
      tehais: [
        wire.hai.map(num => numToMjai(num)),
        Array.from({ length: 13 }).map(() => '?' as const),
        Array.from({ length: 13 }).map(() => '?' as const),
        Array.from({ length: 13 }).map(() => '?' as const),
      ],
    })
  }

  if (wire.tag === 'DORA') {
    events.push({
      type: 'dora',
      dora_marker: numToMjai(wire.hai),
    })
  }

  if (wire.tag === 'REACH' && wire.step === 2) {
    events.push({ type: 'reach', actor: wire.who })
  }

  if (wire.tag === 'AGARI') {
    events.push({
      type: 'hora',
      actor: wire.who,
      target: wire.fromWho,
    })
    events.push({ type: 'end_kyoku' })
  }

  if (wire.tag === 'RYUUKYOKU') {
    events.push({ type: 'ryukyoku' })
    events.push({ type: 'end_kyoku' })
  }

  if (
    wire.tag === 'T' ||
    wire.tag === 'U' ||
    wire.tag === 'V' ||
    wire.tag === 'W'
  ) {
    events.push({
      type: 'tsumo',
      actor: ['T', 'U', 'V', 'W'].indexOf(wire.tag),
      pai: wire.hai !== undefined ? numToMjai(wire.hai) : '?',
    })
  }

  if (
    wire.tag === 'D' ||
    wire.tag === 'E' ||
    wire.tag === 'F' ||
    wire.tag === 'G'
  ) {
    events.push({
      type: 'dahai',
      actor: ['D', 'E', 'F', 'G'].indexOf(wire.tag),
      pai: numToMjai(wire.hai),
      tsumogiri: false,
    })
  }

  return { events, candidates }
}

function createSession (): PlatformSession {
  return {}
}

function onOutbound (_buffer: Buffer, session: PlatformSession): PlatformProcessResult {
  return { result: { events: [], candidates: [] }, session }
}

function onInbound (buffer: Buffer, session: PlatformSession): PlatformProcessResult {
  const wire = decodeWire(buffer)
  logger.info(`<parser> parsed wire buffer: ${JSON.stringify(structuredClone(wire))}`)
  if (wire === null) {
    return { result: { events: [], candidates: [] }, session }
  }
  const result = wireToMjai(wire)
  return { result, session }
}

export const tenhouPlatform: Platform = {
  createSession,
  onOutbound,
  onInbound,
}
