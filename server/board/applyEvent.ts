import type { MjaiEvent } from '../types/Mjai'
import { sortPai } from '../utils/pai'
import { Game } from './Game'
import { Round } from './Round'

function applyEvent (game: Game, event: MjaiEvent): number {
  if (event.type === 'start_kyoku') {
    game.rounds[0] = new Round({
      bakaze: event.bakaze,
      kyoku: event.kyoku,
      honba: event.honba,
      scores: [...event.scores],
      meSeat: game.meSeat,
      tehais: event.tehais.map(tehai => [...tehai]),
      leftTileCnt: event.scores.length === 4 ? 70 : 42,
      doraMarkers: [event.dora_marker],
      kyotaku: event.kyotaku,
      oya: event.oya,
    })
    game.roundPointer = 0
  }
  const round = game.rounds[game.roundPointer]
  if (round === undefined) { return NaN }
  round.steps.push(event)

  if (event.type === 'ankan') {
    round.players[event.actor].ankan.push([
      event.consumed[0], event.consumed[0],
      event.consumed[0], event.consumed[0],
    ])
    const hand = round.players[event.actor].hand
    if (event.actor === round.meSeat) {
      for (let i = 0; i < hand.length; i++) {
        if (hand[i] === event.consumed[0]) {
          hand.splice(i, 1)
          i--
        }
      }
    } else {
      hand.splice(0, 4)
    }
  }
  if (event.type === 'kakan') {
    round.players[event.actor].fulu.push([
      event.pai, event.pai, event.pai, event.pai,
    ])
    if (event.actor === round.meSeat) {
      const index = round.players[event.actor].hand.findIndex(t => t === event.pai)
      if (index > -1) { round.players[event.actor].hand.splice(index, 1) }
    } else {
      round.players[event.actor].hand.splice(0, 1)
    }
  }
  if (event.type === 'pon' || event.type === 'chi' || event.type === 'daiminkan') {
    round.players[event.actor].fulu.push(sortPai([...event.consumed, event.pai]))
    round.players[event.target].he.pop()
    if (event.actor === round.meSeat) {
      for (const consumedPai of event.consumed) {
        const index = round.players[event.actor].hand.findIndex(t => t === consumedPai)
        if (index > -1) { round.players[event.actor].hand.splice(index, 1) }
      }
    } else {
      round.players[event.actor].hand.splice(0, event.consumed.length)
    }
  }
  if (event.type === 'nuki') {
    round.players[event.actor].nuki.push('N')
    if (event.actor === round.meSeat) {
      const index = round.players[event.actor].hand.findIndex(t => t === 'N')
      if (index > -1) { round.players[event.actor].hand.splice(index, 1) }
    } else {
      round.players[event.actor].hand.splice(0, 1)
    }
  }
  if (event.type === 'tsumo') {
    round.players[event.actor].hand.push(event.pai)
    let isDrawFromLeftTiles = true
    for (let i = round.steps.length - 2; i >= 0; i--) {
      if (round.steps[i].type === 'daiminkan' || round.steps[i].type === 'ankan' || round.steps[i].type === 'kakan') {
        isDrawFromLeftTiles = false
        break
      }
      if (round.steps[i].type === 'tsumo') { break }
    }
    if (isDrawFromLeftTiles) { round.leftTileCnt-- }
  }
  if (event.type === 'dahai') {
    round.players[event.actor].he.push(event.pai)
    round.players[event.actor].discards.push(event.pai)
    if (event.actor === round.meSeat) {
      const index = round.players[event.actor].hand.findIndex(t => t === event.pai)
      if (index > -1) { round.players[event.actor].hand.splice(index, 1) }
    } else {
      round.players[event.actor].hand.splice(0, 1)
    }
  }
  if (event.type === 'reach') {
    round.players[event.actor].isReach = true
    round.scores[event.actor] -= round.kyotaku
  }
  if (event.type === 'dora') {
    round.doraMarkers.push(event.dora_marker)
  }

  return round.steps.length - 1
}

export { applyEvent }
