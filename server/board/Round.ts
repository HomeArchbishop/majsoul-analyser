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
  tilesLeft: number
  meSeat: number
  tehais: Pai[][]
}

export class Round {
  constructor (options: RoundConstructorOptions) {
    this.meSeat = options.meSeat
    this.scores = [...options.scores]
    this.playerCnt = options.scores.length
    this.bakaze = options.bakaze
    this.kyoku = options.kyoku
    this.honba = options.honba
    this.kyotaku = options.kyotaku
    this.oya = options.oya
    this.tilesLeft = options.tilesLeft
    this.doraMarkers = options.doraMarkers

    for (let i = 0; i < this.playerCnt; i++) {
      this.players.push({
        tehai: [...options.tehais[i]],
        sutehai: [],
        furo: [],
        ankan: [],
        reached: false,
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
  tilesLeft: number

  players: Array<{
    tehai: Pai[]
    sutehai: Pai[]
    furo: Pai[][]
    ankan: Pai[][]
    reached: boolean
    nuki: Pai[]
  }> = []

  events: MjaiEventList = []
}
