import type { Pai } from '@/types/Mjai'
import { paiMatches } from '@/utils/pai'

export interface Meld {
  tiles: Pai[]
  /** 横置牌索引（标来源），-1 表示无；明杠第四张在末尾，叠牌由 UI 推导 */
  calledIndex: number
  concealed: boolean
}

function relativeSeat (actor: number, target: number, playerCnt: number): number {
  return (target - actor + playerCnt) % playerCnt
}

export function meldFromChi (consumed: Pai[], pai: Pai): Meld {
  return {
    tiles: [pai, consumed[0], consumed[1]],
    calledIndex: 0,
    concealed: false,
  }
}

export function meldFromPon (
  consumed: Pai[],
  pai: Pai,
  actor: number,
  target: number,
  playerCnt: number,
): Meld {
  const diff = relativeSeat(actor, target, playerCnt)
  switch (diff) {
    case 1:
      return { tiles: [consumed[0], consumed[1], pai], calledIndex: 2, concealed: false }
    case 2:
      return { tiles: [consumed[0], pai, consumed[1]], calledIndex: 1, concealed: false }
    case 3:
      return { tiles: [pai, consumed[0], consumed[1]], calledIndex: 0, concealed: false }
    default:
      return { tiles: [consumed[0], pai, consumed[1]], calledIndex: 1, concealed: false }
  }
}

/** 大明杠：与碰同形（横置标来源），第四张放末尾供 UI 叠在横置上 */
export function meldFromDaiminkan (
  consumed: Pai[],
  pai: Pai,
  actor: number,
  target: number,
  playerCnt: number,
): Meld {
  const diff = relativeSeat(actor, target, playerCnt)
  switch (diff) {
    case 1:
      return {
        tiles: [consumed[0], consumed[1], pai, consumed[2]],
        calledIndex: 2,
        concealed: false,
      }
    case 2:
      return {
        tiles: [consumed[0], pai, consumed[1], consumed[2]],
        calledIndex: 1,
        concealed: false,
      }
    case 3:
      return {
        tiles: [pai, consumed[0], consumed[1], consumed[2]],
        calledIndex: 0,
        concealed: false,
      }
    default:
      return {
        tiles: [consumed[0], pai, consumed[1], consumed[2]],
        calledIndex: 1,
        concealed: false,
      }
  }
}

export function meldFromAnkan (tile: Pai): Meld {
  return {
    tiles: [tile, tile, tile, tile],
    calledIndex: -1,
    concealed: true,
  }
}

export function applyKakanToMeld (meld: Meld, pai: Pai): void {
  meld.tiles.push(pai)
}

export function findPonMeldIndex (melds: Meld[], pai: Pai): number {
  return melds.findIndex(meld => {
    return meld.tiles.length === 3 && meld.tiles.every(tile => paiMatches(tile, pai))
  })
}
