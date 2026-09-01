import type { MjaiEvent, Pai } from '../types/Mjai'
import { paiMatches, removeMatchingFromTehai, sortPai } from '../utils/pai'
import { Game } from './Game'
import { Round } from './Round'

const REACH_COST = 1000

const KAN_EVENT_TYPES = new Set(['daiminkan', 'ankan', 'kakan'])

function applyStartKyoku (
  game: Game,
  event: Extract<MjaiEvent, { type: 'start_kyoku' }>,
): void {
  game.rounds[0] = new Round({
    bakaze: event.bakaze,
    kyoku: event.kyoku,
    honba: event.honba,
    scores: [...event.scores],
    meSeat: game.meSeat,
    tehais: event.tehais.map(tehai => [...tehai]),
    tilesLeft: event.scores.length === 4 ? 70 : 42,
    doraMarkers: [event.dora_marker],
    kyotaku: event.kyotaku,
    oya: event.oya,
  })
  game.roundPointer = 0
}

function removeFromTehai (
  round: Round,
  actor: number,
  pai: Pai,
  count: number,
): void {
  const tehai = round.players[actor].tehai
  if (actor === round.meSeat) {
    removeMatchingFromTehai(tehai, pai, count)
  } else {
    tehai.splice(0, count)
  }
}

function removeConsumedFromTehai (
  round: Round,
  actor: number,
  consumed: Pai[],
): void {
  if (actor === round.meSeat) {
    const tehai = round.players[actor].tehai
    for (const pai of consumed) {
      removeMatchingFromTehai(tehai, pai, 1)
    }
  } else {
    round.players[actor].tehai.splice(0, consumed.length)
  }
}

function applyAnkan (
  round: Round,
  event: Extract<MjaiEvent, { type: 'ankan' }>,
): void {
  const tile = event.consumed[0]
  round.players[event.actor].ankan.push([tile, tile, tile, tile])
  removeFromTehai(round, event.actor, tile, 4)
}

function applyKakan (
  round: Round,
  event: Extract<MjaiEvent, { type: 'kakan' }>,
): void {
  const player = round.players[event.actor]
  const ponIndex = player.furo.findIndex(group => {
    return group.length === 3 && group.every(tile => paiMatches(tile, event.pai))
  })
  if (ponIndex >= 0) {
    player.furo[ponIndex] = sortPai([...player.furo[ponIndex], event.pai])
  }
  removeFromTehai(round, event.actor, event.pai, 1)
}

function applyChiPonDaiminkan (
  round: Round,
  event: Extract<MjaiEvent, { type: 'chi' | 'pon' | 'daiminkan' }>,
): void {
  const { actor, target, consumed, pai } = event
  round.players[actor].furo.push(sortPai([...consumed, pai]))
  round.players[target].sutehai.pop()
  removeConsumedFromTehai(round, actor, consumed)
}

function applyNuki (
  round: Round,
  event: Extract<MjaiEvent, { type: 'nuki' }>,
): void {
  round.players[event.actor].nuki.push('N')
  removeFromTehai(round, event.actor, 'N', 1)
}

function isDrawFromTilesLeft (events: MjaiEvent[]): boolean {
  for (let i = events.length - 2; i >= 0; i--) {
    const prev = events[i]
    if (KAN_EVENT_TYPES.has(prev.type)) { return false }
    if (prev.type === 'tsumo') { break }
  }
  return true
}

function applyTsumo (
  round: Round,
  event: Extract<MjaiEvent, { type: 'tsumo' }>,
): void {
  round.players[event.actor].tehai.push(event.pai)
  if (isDrawFromTilesLeft(round.events)) {
    round.tilesLeft--
  }
}

function applyDahai (
  round: Round,
  event: Extract<MjaiEvent, { type: 'dahai' }>,
): void {
  round.players[event.actor].sutehai.push(event.pai)
  removeFromTehai(round, event.actor, event.pai, 1)
}

function applyReach (
  round: Round,
  event: Extract<MjaiEvent, { type: 'reach' }>,
): void {
  round.players[event.actor].reached = true
  round.scores[event.actor] -= REACH_COST
  round.kyotaku += 1
}

function applyDora (
  round: Round,
  event: Extract<MjaiEvent, { type: 'dora' }>,
): void {
  round.doraMarkers.push(event.dora_marker)
}

function applyEndKyoku (
  round: Round,
  event: Extract<MjaiEvent, { type: 'end_kyoku' }>,
): void {
  if (event.scores !== undefined) {
    round.scores = [...event.scores]
  }
}

function applyRoundEvent (round: Round, event: MjaiEvent): void {
  switch (event.type) {
    case 'ankan':
      applyAnkan(round, event)
      break
    case 'kakan':
      applyKakan(round, event)
      break
    case 'pon':
    case 'chi':
    case 'daiminkan':
      applyChiPonDaiminkan(round, event)
      break
    case 'nuki':
      applyNuki(round, event)
      break
    case 'tsumo':
      applyTsumo(round, event)
      break
    case 'dahai':
      applyDahai(round, event)
      break
    case 'reach':
      applyReach(round, event)
      break
    case 'dora':
      applyDora(round, event)
      break
    case 'end_kyoku':
      applyEndKyoku(round, event)
      break
  }
}

export function applyEvent (game: Game, event: MjaiEvent): number {
  if (event.type === 'start_kyoku') {
    applyStartKyoku(game, event)
  }

  const round = game.rounds[game.roundPointer]
  if (round === undefined) { return NaN }

  round.events.push(event)
  applyRoundEvent(round, event)

  return round.events.length - 1
}
