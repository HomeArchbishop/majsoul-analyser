import { Game } from '@/board/Game'
import {
  applyKakanToMeld,
  findPonMeldIndex,
  meldFromAnkan,
  meldFromChi,
  meldFromDaiminkan,
  meldFromPon,
} from '@/board/Meld'
import {
  clearReachRiverIfTaken,
  declareReachLay,
  shiftReachHandLayByCount,
  shiftReachHandLayExact,
} from '@/board/reachLay'
import { Round } from '@/board/Round'
import type { MjaiEvent, Pai } from '@/types/Mjai'
import { removeMatchingFromTehai, resolveFromTehai } from '@/utils/pai'

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

function noteHandRemove (
  round: Round,
  actor: number,
  tehaiBefore: Pai[],
  consumed: Pai[],
): void {
  const lay = round.players[actor]
  if (actor === round.meSeat) {
    shiftReachHandLayExact(lay, tehaiBefore, consumed)
  } else {
    shiftReachHandLayByCount(lay, consumed.length)
  }
}

function clearTsumo (round: Round, actor: number): void {
  round.players[actor].tsumoPai = null
}

function applyAnkan (
  round: Round,
  event: Extract<MjaiEvent, { type: 'ankan' }>,
): void {
  const tile = event.consumed[0]
  const consumed = [tile, tile, tile, tile]
  const tehaiBefore = [...round.players[event.actor].tehai]
  noteHandRemove(round, event.actor, tehaiBefore, consumed)
  clearTsumo(round, event.actor)
  round.players[event.actor].ankan.push(meldFromAnkan(tile))
  removeFromTehai(round, event.actor, tile, 4)
}

function applyKakan (
  round: Round,
  event: Extract<MjaiEvent, { type: 'kakan' }>,
): void {
  const player = round.players[event.actor]
  const tehaiBefore = [...player.tehai]
  noteHandRemove(round, event.actor, tehaiBefore, [event.pai])
  clearTsumo(round, event.actor)
  const ponIndex = findPonMeldIndex(player.furo, event.pai)
  if (ponIndex >= 0) {
    applyKakanToMeld(player.furo[ponIndex], event.pai)
  }
  removeFromTehai(round, event.actor, event.pai, 1)
}

function applyChiPonDaiminkan (
  round: Round,
  event: Extract<MjaiEvent, { type: 'chi' | 'pon' | 'daiminkan' }>,
): void {
  const { actor, target, pai } = event
  const playerCnt = round.playerCnt
  const consumed = actor === round.meSeat
    ? resolveFromTehai(round.players[actor].tehai, event.consumed)
    : event.consumed
  const tehaiBefore = [...round.players[actor].tehai]
  noteHandRemove(round, actor, tehaiBefore, consumed)
  clearTsumo(round, actor)

  let meld
  if (event.type === 'chi') {
    meld = meldFromChi(consumed, pai)
  } else if (event.type === 'pon') {
    meld = meldFromPon(consumed, pai, actor, target, playerCnt)
  } else {
    meld = meldFromDaiminkan(consumed, pai, actor, target, playerCnt)
  }
  round.players[actor].furo.push(meld)

  const targetPlayer = round.players[target]
  clearReachRiverIfTaken(targetPlayer, targetPlayer.sutehai.length)
  targetPlayer.sutehai.pop()
  removeConsumedFromTehai(round, actor, consumed)
}

function applyNuki (
  round: Round,
  event: Extract<MjaiEvent, { type: 'nuki' }>,
): void {
  const tehaiBefore = [...round.players[event.actor].tehai]
  noteHandRemove(round, event.actor, tehaiBefore, ['N'])
  clearTsumo(round, event.actor)
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
  const player = round.players[event.actor]
  player.tehai.push(event.pai)
  player.tsumoPai = event.pai
  if (isDrawFromTilesLeft(round.events)) {
    round.tilesLeft--
  }
}

function applyDahai (
  round: Round,
  event: Extract<MjaiEvent, { type: 'dahai' }>,
): void {
  const player = round.players[event.actor]
  if (player.reached) {
    declareReachLay(player, player.tehai, event.pai, player.sutehai.length)
  }
  player.sutehai.push(event.pai)
  clearTsumo(round, event.actor)
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
