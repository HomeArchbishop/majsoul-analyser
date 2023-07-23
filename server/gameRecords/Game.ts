import { Round } from './Round'

interface GameConstructorOptions {
  meSeat: number // 0 | 1 | 2 | 3
}

class Game {
  constructor ({ meSeat }: GameConstructorOptions) {
    this.meSeat = meSeat
  }

  meSeat: number // 0 | 1 | 2 | 3

  roundPointer: number = -1
  rounds: Round[] = []
}

export { Game }
