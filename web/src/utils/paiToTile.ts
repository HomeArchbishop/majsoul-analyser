import type { Pai } from '../types'

const HONOR_TO_WIRE: Record<string, string> = {
  E: '1z',
  S: '2z',
  W: '3z',
  N: '4z',
  P: '5z',
  F: '6z',
  C: '7z',
}

/** MJAI pai → `web/public/tiles/` 文件名。 */
function paiToTileFilename (pai: Pai): string {
  if (pai === '?') { return 'mahjong-Back.png' }
  if (pai === '5mr') { return 'mahjong-0m.png' }
  if (pai === '5pr') { return 'mahjong-0p.png' }
  if (pai === '5sr') { return 'mahjong-0s.png' }
  if (pai in HONOR_TO_WIRE) { return `mahjong-${HONOR_TO_WIRE[pai]}.png` }
  if (/^[1-9][mps]$/.test(pai)) { return `mahjong-${pai}.png` }
  return 'mahjong-Blank.png'
}

export function paiToTileSrc (pai: Pai): string {
  return `/tiles/${paiToTileFilename(pai)}`
}

const HONOR_LABELS: Record<string, string> = {
  E: '东',
  S: '南',
  W: '西',
  N: '北',
  P: '白',
  F: '发',
  C: '中',
  '5mr': '0m',
  '5pr': '0p',
  '5sr': '0s',
}

export function formatPaiLabel (pai: Pai): string {
  if (pai === '?') { return '?' }
  return HONOR_LABELS[pai] ?? pai
}
