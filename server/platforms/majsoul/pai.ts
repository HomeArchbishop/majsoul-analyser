import type { Kaze, Pai } from '../../types/Mjai'
import { toBakaze } from '../../utils/pai'

export type WirePai = string

const KAZE_FROM_WIRE: Record<string, Kaze> = {
  '1z': 'E', '2z': 'S', '3z': 'W', '4z': 'N',
}

const HONOR_FROM_WIRE: Record<string, Pai> = {
  '5z': 'P', '6z': 'F', '7z': 'C',
}

export function wirePaiToMjai (tile: WirePai): Pai {
  if (tile === '?') { return '?' }
  if (tile === '0m') { return '5mr' }
  if (tile === '0p') { return '5pr' }
  if (tile === '0s') { return '5sr' }
  if (tile in KAZE_FROM_WIRE) { return KAZE_FROM_WIRE[tile] }
  if (tile in HONOR_FROM_WIRE) { return HONOR_FROM_WIRE[tile] }
  if (/^[1-9][mps]$/.test(tile)) { return tile as Pai }
  return tile as Pai
}

export function wirePaiListToMjai (tiles: WirePai[]): Pai[] {
  return tiles.map(wirePaiToMjai)
}

export { toBakaze }
