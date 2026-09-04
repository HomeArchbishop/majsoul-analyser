import type { Pai } from '../types'

function paiSortKey (pai: Pai): string {
  if (pai === '?') { return 'z99' }
  if (pai === '5mr' || pai === '5pr' || pai === '5sr') {
    // 赤 5 与同花色 5 同序，赤排在普通 5 前面（m50 vs m51）
    return pai[1] + '50'
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

function removeOne (tehai: Pai[], pai: Pai): Pai[] {
  const copy = [...tehai]
  const i = copy.indexOf(pai)
  if (i >= 0) { copy.splice(i, 1) }
  return copy
}

export function sortedTehai (tehai: Pai[], tsumoPai: Pai | null): { body: Pai[], tsumo: Pai | null } {
  if (tsumoPai === null) {
    return { body: sortPai(tehai), tsumo: null }
  }
  const body = sortPai(removeOne(tehai, tsumoPai))
  const tsumo = tehai.includes(tsumoPai) ? tsumoPai : null
  return { body, tsumo }
}
