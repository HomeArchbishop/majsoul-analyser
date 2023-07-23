import { type Tile } from '../types/General'

export interface RoundConstructorOptions {
  chang: number
  ju: number
  ben: number
  al: boolean
  scores: number[]
  leftTileCnt: number
  doras: Tile[]

  meSeat: number
  meTiles: Tile[]
}

class Round {
  constructor (options: RoundConstructorOptions) {
    this.meSeat = options.meSeat
    this.scores = options.scores
    this.playerCnt = options.scores.length
    this.chang = options.chang
    this.ju = options.ju
    this.ben = options.ben
    this.isAllLast = options.al
    this.leftTileCnt = options.leftTileCnt
    this.doras = options.doras

    this.changfeng = this.chang
    this.zifeng = (this.meSeat - this.ju + 4) % 4

    for (let i = 0; i < this.playerCnt; i++) {
      this.players.push({
        discards: [],
        he: [],
        hand: this.meSeat === i ? options.meTiles : undefined,
        fulu: [],
        anGang: [],
        isLiqi: false,
        isWLiqi: false,
        canIPatsu: false,
        baBei: []
      })
    }
  }

  meSeat: number
  playerCnt: number
  scores: number[]

  chang: number
  ju: number
  ben: number

  isAllLast: boolean

  changfeng: number
  zifeng: number
  doras: Tile[]
  leftTileCnt: number

  players: Array<{
    discards: Tile[]
    he: Tile[]
    hand?: Tile[]
    fulu: Tile[][]
    anGang: Tile[][]
    isLiqi: boolean
    isWLiqi: boolean
    canIPatsu: boolean
    baBei: Array<'4z'>
  }> = []
}

export { Round }
