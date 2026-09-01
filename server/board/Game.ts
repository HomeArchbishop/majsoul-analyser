import { Round } from './Round'

interface GameConstructorOptions {
  meSeat: number
}

export class Game {
  constructor ({ meSeat }: GameConstructorOptions) {
    this.meSeat = meSeat
  }

  meSeat: number

  roundPointer: number = -1
  rounds: Round[] = []
}
