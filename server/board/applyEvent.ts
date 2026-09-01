import type { MjaiEvent } from '../types/Mjai'
import { paiMatches, removeMatchingFromTehai, sortPai } from '../utils/pai'
import { Game } from './Game'
import { Round } from './Round'

const REACH_COST = 1000

export function applyEvent (game: Game, event: MjaiEvent): number {
  if (event.type === 'start_kyoku') {
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
  const round = game.rounds[game.roundPointer]
  if (round === undefined) { return NaN }
  round.events.push(event)

  if (event.type === 'ankan') {
    round.players[event.actor].ankan.push([
      event.consumed[0], event.consumed[0],
      event.consumed[0], event.consumed[0],
    ])
    const tehai = round.players[event.actor].tehai
    if (event.actor === round.meSeat) {
      removeMatchingFromTehai(tehai, event.consumed[0], 4)
    } else {
      tehai.splice(0, 4)
    }
  }
  if (event.type === 'kakan') {
    const player = round.players[event.actor]
    const ponIndex = player.furo.findIndex(
      group => group.length === 3 && group.every(t => paiMatches(t, event.pai)),
    )
    if (ponIndex >= 0) {
      player.furo[ponIndex] = sortPai([...player.furo[ponIndex], event.pai])
    }
    if (event.actor === round.meSeat) {
      removeMatchingFromTehai(player.tehai, event.pai, 1)
    } else {
      player.tehai.splice(0, 1)
    }
  }
  if (event.type === 'pon' || event.type === 'chi' || event.type === 'daiminkan') {
    round.players[event.actor].furo.push(sortPai([...event.consumed, event.pai]))
    round.players[event.target].sutehai.pop()
    if (event.actor === round.meSeat) {
      for (const consumedPai of event.consumed) {
        removeMatchingFromTehai(round.players[event.actor].tehai, consumedPai, 1)
      }
    } else {
      round.players[event.actor].tehai.splice(0, event.consumed.length)
    }
  }
  if (event.type === 'nuki') {
    round.players[event.actor].nuki.push('N')
    if (event.actor === round.meSeat) {
      removeMatchingFromTehai(round.players[event.actor].tehai, 'N', 1)
    } else {
      round.players[event.actor].tehai.splice(0, 1)
    }
  }
  if (event.type === 'tsumo') {
    round.players[event.actor].tehai.push(event.pai)
    let isDrawFromLeftTiles = true
    for (let i = round.events.length - 2; i >= 0; i--) {
      if (round.events[i].type === 'daiminkan' || round.events[i].type === 'ankan' || round.events[i].type === 'kakan') {
        isDrawFromLeftTiles = false
        break
      }
      if (round.events[i].type === 'tsumo') { break }
    }
    if (isDrawFromLeftTiles) { round.tilesLeft-- }
  }
  if (event.type === 'dahai') {
    round.players[event.actor].sutehai.push(event.pai)
    if (event.actor === round.meSeat) {
      removeMatchingFromTehai(round.players[event.actor].tehai, event.pai, 1)
    } else {
      round.players[event.actor].tehai.splice(0, 1)
    }
  }
  if (event.type === 'reach') {
    round.players[event.actor].reached = true
    round.scores[event.actor] -= REACH_COST
    round.kyotaku += 1
  }
  if (event.type === 'dora') {
    round.doraMarkers.push(event.dora_marker)
  }
  if (event.type === 'end_kyoku' && event.scores !== undefined) {
    round.scores = [...event.scores]
  }

  return round.events.length - 1
}
