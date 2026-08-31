import type { Kaze, Pai } from '../types/Mjai'

/** 雀魂 protobuf 牌面编码（解析器内部 wire 格式） */
export type MajsoulPai = string

const KAZE_FROM_MAJSOUL: Record<string, Kaze> = {
  '1z': 'E', '2z': 'S', '3z': 'W', '4z': 'N',
}

const KAZE_TO_MAJSOUL: Record<Kaze, string> = {
  E: '1z', S: '2z', W: '3z', N: '4z',
}

const HONOR_FROM_MAJSOUL: Record<string, Pai> = {
  '5z': 'P', '6z': 'F', '7z': 'C',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HONOR_TO_MAJSOUL: Record<string, string> = {
  P: '5z', F: '6z', C: '7z',
}

function majsoulPaiToMjai (tile: MajsoulPai): Pai {
  if (tile === '?') { return '?' }
  if (tile === '0m') { return '5mr' }
  if (tile === '0p') { return '5pr' }
  if (tile === '0s') { return '5sr' }
  if (tile in KAZE_FROM_MAJSOUL) { return KAZE_FROM_MAJSOUL[tile] }
  if (tile in HONOR_FROM_MAJSOUL) { return HONOR_FROM_MAJSOUL[tile] }
  if (/^[1-9][mps]$/.test(tile)) { return tile as Pai }
  return tile as Pai
}

function majsoulPaiListToMjai (tiles: MajsoulPai[]): Pai[] {
  return tiles.map(majsoulPaiToMjai)
}

function majsoulChangToKaze (chang: number): Kaze {
  return KAZE_FROM_MAJSOUL[`${chang + 1}z`] ?? 'E'
}

function tenhouNumToMjai (num: number): Pai {
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

function tenhouSeedToKaze (seed0: number): Kaze {
  const idx = ((~~(seed0 / 4) - 1) % 4) + 1
  return KAZE_FROM_MAJSOUL[`${idx}z`] ?? 'E'
}

function paiSortKey (pai: Pai): string {
  if (pai === '?') { return 'z99' }
  if (pai === '5mr' || pai === '5pr' || pai === '5sr') {
    return pai[2] + '50'
  }
  if (pai.length === 1) {
    const order = 'ESWNPFC'
    return `z${String(order.indexOf(pai)).padStart(2, '0')}`
  }
  const rank = pai[0] === '0' ? '5' : pai[0]
  return pai[1] + rank.padStart(2, '0')
}

function sortPai (pais: Pai[]): Pai[] {
  return [...pais].sort((a, b) => paiSortKey(a).localeCompare(paiSortKey(b)))
}

function nextPai (pai: Pai): Pai {
  if (pai === 'E') { return 'S' }
  if (pai === 'S') { return 'W' }
  if (pai === 'W') { return 'N' }
  if (pai === 'N') { return 'E' }
  if (pai === 'P') { return 'F' }
  if (pai === 'F') { return 'C' }
  if (pai === 'C') { return 'P' }
  if (pai === '5mr' || pai === '5m') { return '6m' }
  if (pai === '5pr' || pai === '5p') { return '6p' }
  if (pai === '5sr' || pai === '5s') { return '6s' }
  if (/^[1-9][mps]$/.test(pai)) {
    const rank = (+pai[0] % 9) + 1
    return `${rank}${pai[1]}` as Pai
  }
  return pai
}

/** mahjong-helper CLI 用牌面标签 */
function paiToHelperLabel (pai: Pai): string {
  const map: Record<string, string> = {
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
  if (pai in map) { return map[pai] }
  return pai
}

function formatPai (pais: Pai[]): string {
  return sortPai(pais)
    .map(p => paiToHelperLabel(p))
    .reduce((acc, c, i, arr) => {
      const prev = arr[i - 1]
      const sameSuit = prev !== undefined && prev.slice(-1) === c.slice(-1) && !/^[东南西北白发中]/.test(c)
      if (i >= arr.length - 1 || !sameSuit || /^[东南西北白发中]/.test(arr[i + 1])) {
        acc += c + ' '
      } else {
        acc += c[0]
      }
      return acc
    }, '')
    .slice(0, -1)
}

function helperLabelToPai (label: string): Pai {
  const map: Record<string, Pai> = {
    东: 'E',
    南: 'S',
    西: 'W',
    北: 'N',
    白: 'P',
    发: 'F',
    中: 'C',
    '0m': '5mr',
    '0p': '5pr',
    '0s': '5sr',
  }
  if (label in map) { return map[label] }
  return label as Pai
}

export {
  formatPai,
  helperLabelToPai,
  KAZE_TO_MAJSOUL,
  majsoulChangToKaze,
  majsoulPaiListToMjai,
  majsoulPaiToMjai,
  nextPai,
  paiToHelperLabel,
  sortPai,
  tenhouNumToMjai,
  tenhouSeedToKaze,
}
