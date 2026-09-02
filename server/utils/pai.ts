import type { Pai } from '@/types/Mjai'

/** 从 tehai 按请求顺序解析实际牌（赤 5 优先精确匹配，否则等价匹配）。 */
export function resolveFromTehai (tehai: Pai[], requested: Pai[]): Pai[] {
  const pool = [...tehai]
  return requested.map((req) => {
    let i = pool.findIndex(t => t === req)
    if (i < 0) { i = pool.findIndex(t => paiMatches(t, req)) }
    if (i < 0) { return req }
    const actual = pool[i]
    pool.splice(i, 1)
    return actual
  })
}

/** 5 与赤 5 视为同牌（碰/杠/删手牌时）。 */
export function paiMatches (a: Pai, b: Pai): boolean {
  if (a === b) { return true }
  if (a === '5mr' && b === '5m') { return true }
  if (a === '5m' && b === '5mr') { return true }
  if (a === '5pr' && b === '5p') { return true }
  if (a === '5p' && b === '5pr') { return true }
  if (a === '5sr' && b === '5s') { return true }
  if (a === '5s' && b === '5sr') { return true }
  return false
}

/** 从 tehai 移除 count 张与 pai 匹配的牌（含赤 5 等价）。 */
export function removeMatchingFromTehai (tehai: Pai[], pai: Pai, count: number): void {
  let removed = 0
  for (let i = 0; i < tehai.length && removed < count; i++) {
    if (paiMatches(tehai[i], pai)) {
      tehai.splice(i, 1)
      i--
      removed++
    }
  }
}

const BAKAZE_ORDER: Array<'E' | 'S' | 'W' | 'N'> = ['E', 'S', 'W', 'N']

/** 场风 wire 序号 (0–3) → MJAI bakaze。 */
export function toBakaze (wireIndex: number): 'E' | 'S' | 'W' | 'N' {
  return BAKAZE_ORDER[wireIndex] ?? 'E'
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

export function sortPai (pais: Pai[]): Pai[] {
  return [...pais].sort((a, b) => paiSortKey(a).localeCompare(paiSortKey(b)))
}

export function nextPai (pai: Pai): Pai {
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
export function paiToHelperLabel (pai: Pai): string {
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

export function formatPai (pais: Pai[]): string {
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

export function helperLabelToPai (label: string): Pai {
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
