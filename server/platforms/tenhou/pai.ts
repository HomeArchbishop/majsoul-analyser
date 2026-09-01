import type { Pai } from '@/types/Mjai'
import { toBakaze } from '@/utils/pai'

export function numToMjai (num: number): Pai {
  const suit = ['m', 'p', 's', 'z'][~~(num / 36)]
  if (num === 16 || num === 52 || num === 88) {
    if (suit === 'm') { return '5mr' }
    if (suit === 'p') { return '5pr' }
    if (suit === 's') { return '5sr' }
  }
  const rank = ~~(num % 36 / 4) + 1
  if (suit === 'z') {
    const map: Record<number, Pai> = { 1: 'E', 2: 'S', 3: 'W', 4: 'N', 5: 'P', 6: 'F', 7: 'C' }
    return map[rank] ?? 'P'
  }
  return `${rank}${suit}` as Pai
}

/** 天凤 INIT seed[0] → MJAI bakaze。 */
export function toBakazeFromTenhouSeed (seed0: number): ReturnType<typeof toBakaze> {
  return toBakaze(((~~(seed0 / 4) - 1) % 4))
}
