import type { MjaiEventList } from '../types/Mjai'
import { Kaze, Pai } from '../types/Mjai'

export interface RoundConstructorOptions {
  bakaze: Kaze
  kyoku: number
  honba: number
  scores: number[]
  kyotaku: number
  oya: number
  doraMarkers: Pai[]
  leftTileCnt: number
  meSeat: number
  tehais: Pai[][]
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
        nuki: [],
      })
    }
  }

  meSeat: number
  playerCnt: number
  scores: number[]

  bakaze: Kaze
  kyoku: number
  honba: number
  kyotaku: number
  oya: number

  doraMarkers: Pai[]
  leftTileCnt: number

  players: Array<{
    discards: Pai[]
    he: Pai[]
    hand: Pai[]
    fulu: Pai[][]
    ankan: Pai[][]
    isReach: boolean
    nuki: Pai[]
  }> = []

  steps: MjaiEventList = []
}

export { Round }
