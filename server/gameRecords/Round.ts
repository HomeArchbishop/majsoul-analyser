import { type Tile } from '../types/General'
import { ParsedMsgList } from '../types/ParsedMsg'

export interface RoundConstructorOptions {
  bakaze: '1z' | '2z' | '3z' | '4z' // 场风
  kyoku: number // 局 0123
  honba: number // 本場 0123
  scores: number[]
  kyotaku: number // 供託
  oya: number // 親 (庄)
  doraMarkers: Tile[]

  leftTileCnt: number

  meSeat: number

  tehais: Array<Array<(Tile | '?')>> // 所有玩家的起牌13张
}

class Round {
  constructor (options: RoundConstructorOptions) {
    this.meSeat = options.meSeat
    this.scores = [...options.scores]
    this.playerCnt = options.scores.length
    this.bakaze = options.bakaze
    this.kyoku = options.kyoku
    this.honba = options.honba
    this.kyotaku = options.kyotaku
    this.oya = options.oya
    this.leftTileCnt = options.leftTileCnt
    this.doraMarkers = options.doraMarkers

    for (let i = 0; i < this.playerCnt; i++) {
      this.players.push({
        discards: [],
        he: [],
        hand: [...options.tehais[i]],
        fulu: [],
        ankan: [],
        isReach: false,
        baBei: []
      })
    }
  }

  meSeat: number
  playerCnt: number
  scores: number[]

  bakaze: '1z' | '2z' | '3z' | '4z'
  kyoku: number
  honba: number
  kyotaku: number
  oya: number

  doraMarkers: Tile[]
  leftTileCnt: number

  players: Array<{
    discards: Tile[]
    he: Tile[]
    hand: Array<(Tile | '?')>
    fulu: Tile[][] // 副露
    ankan: Tile[][]
    isReach: boolean
    baBei: Array<'4z'>
  }> = []

  steps: ParsedMsgList = []
}

export { Round }
