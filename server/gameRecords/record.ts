import { ParsedMsg } from '../types/ParsedMsg'
import { sortTiles } from '../utils/sortTiles'
import { Game } from './Game'
import { Round } from './Round'

function record (game: Game, parsedMsg: ParsedMsg): number {
  /* ========================= */
  /*      start_kyoku消息      */
  /* ========================= */
  if (parsedMsg.type === 'start_kyoku') { /* 新一轮(round)开始 */
    game.rounds[0] = new Round({
      bakaze: parsedMsg.bakaze,
      kyoku: parsedMsg.kyoku,
      honba: parsedMsg.honba,
      scores: [...parsedMsg.scores],
      meSeat: game.meSeat,
      tehais: parsedMsg.tehais.map(tehai => [...tehai]),
      leftTileCnt: parsedMsg.scores.length === 4 ? 70 : 42,
      doraMarkers: [parsedMsg.dora_marker],
      kyotaku: parsedMsg.kyotaku,
      oya: parsedMsg.oya
    })
    game.roundPointer = 0
  }
  const round = game.rounds[game.roundPointer]
  if (round === undefined) { return NaN }
  round.steps.push(parsedMsg)
  /* ======================== */
  /*     一般流程Action消息    */
  /* ======================== */
  if (parsedMsg.type === 'ankan') { /* 暗杠 */
    round.players[parsedMsg.actor].ankan.push([
      parsedMsg.consumed[0], parsedMsg.consumed[0],
      parsedMsg.consumed[0], parsedMsg.consumed[0]
    ])
    const hand = round.players[parsedMsg.actor].hand
    if (parsedMsg.actor === round.meSeat) { /* 如果是自己, 取走手牌 */
      for (let i = 0; i < hand.length; i++) {
        if (hand[i] === parsedMsg.consumed[0]) {
          hand.splice(i, 1)
          i--
        }
      }
    } else {
      hand.splice(0, 4)
    }
  }
  if (parsedMsg.type === 'kakan') { /* 加杠 */
    round.players[parsedMsg.actor].fulu.push([
      parsedMsg.pai, parsedMsg.pai, parsedMsg.pai, parsedMsg.pai
    ])
    if (parsedMsg.actor === round.meSeat) { /* 如果是自己, 取走手牌 */
      const index = round.players[parsedMsg.actor].hand.findIndex(t => t === parsedMsg.pai)
      if (index > -1) {
        round.players[parsedMsg.actor].hand.splice(index, 1)
      }
    } else {
      round.players[parsedMsg.actor].hand.splice(0, 1)
    }
  }
  if (parsedMsg.type === 'pon' || parsedMsg.type === 'chi' || parsedMsg.type === 'daiminkan') { /* 吃碰杠 */
    round.players[parsedMsg.actor].fulu.push(sortTiles([...parsedMsg.consumed, parsedMsg.pai])) /* 放进副露队列 */
    round.players[parsedMsg.target].he.pop() /* 取走别家的牌河里的牌 */
    if (parsedMsg.actor === round.meSeat) { /* 如果是自己, 取走手牌 */
      for (const consumedTile of parsedMsg.consumed) {
        const index = round.players[parsedMsg.actor].hand.findIndex(t => t === consumedTile)
        if (index > -1) {
          round.players[parsedMsg.actor].hand.splice(index, 1)
        }
      }
    } else {
      round.players[parsedMsg.actor].hand.splice(0, parsedMsg.consumed.length)
    }
  }
  if (parsedMsg.type === 'babei') { /* BaBei */
    round.players[parsedMsg.actor].baBei.push('4z')
    if (parsedMsg.actor === round.meSeat) { /* 如果是自己, 取走手牌 */
      const index = round.players[parsedMsg.actor].hand.findIndex(t => t === '4z')
      if (index > -1) {
        round.players[parsedMsg.actor].hand.splice(index, 1)
      }
    } else {
      round.players[parsedMsg.actor].hand.splice(0, 1)
    }
  }
  if (parsedMsg.type === 'tsumo') { /* 摸牌 */
    console.log(parsedMsg.pai)
    round.players[parsedMsg.actor].hand.push(parsedMsg.pai)
    let isDrawFromLeftTiles = true
    for (let i = round.steps.length - 2; i >= 0; i--) { /* 从steps倒数第二步开始遍历 */
      if (round.steps[i].type === 'daiminkan' || round.steps[i].type === 'ankan' || round.steps[i].type === 'kakan') { isDrawFromLeftTiles = false; break }
      if (round.steps[i].type === 'tsumo') { break }
    }
    if (isDrawFromLeftTiles) { /* 如果不从牌山摸牌，减少剩余牌数 */
      round.leftTileCnt--
    }
  }
  if (parsedMsg.type === 'dahai') { /* 舍张 */
    round.players[parsedMsg.actor].he.push(parsedMsg.pai)
    round.players[parsedMsg.actor].discards.push(parsedMsg.pai)
    if (parsedMsg.actor === round.meSeat) { /* 如果是自己, 取走手牌 */
      const index = round.players[parsedMsg.actor].hand.findIndex(t => t === parsedMsg.pai)
      if (index > -1) {
        round.players[parsedMsg.actor].hand.splice(index, 1)
      }
    } else {
      round.players[parsedMsg.actor].hand.splice(0, 1)
    }
  }
  if (parsedMsg.type === 'reach') { /* 立直 */
    round.players[parsedMsg.actor].isReach = true
    round.scores[parsedMsg.actor] -= round.kyotaku
  }
  if (parsedMsg.type === 'dora') { /* 宝牌指示 */
    round.doraMarkers.push(parsedMsg.dora_marker)
  }
  /* ======================== */
  /*   Round结束类Action消息   */
  /* ======================== */
  /* => USELESS, won't handle it */

  return round.steps.length - 1
}

export { record }
