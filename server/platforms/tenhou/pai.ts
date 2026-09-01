import type { Kaze, Pai } from '../../types/Mjai'

const KAZE_FROM_INDEX: Record<string, Kaze> = {
  '1z': 'E', '2z': 'S', '3z': 'W', '4z': 'N',
}

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

export function seedToKaze (seed0: number): Kaze {
  const idx = ((~~(seed0 / 4) - 1) % 4) + 1
  return KAZE_FROM_INDEX[`${idx}z`] ?? 'E'
}
