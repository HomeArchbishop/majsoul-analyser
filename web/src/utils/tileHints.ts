import type { AnalysisSnapshot, Pai } from '../types'

export interface TileHint {
  score: number
  /** 0 = 最佳 */
  rank: number
  /** 相对推荐强度 0–1，用于柱高 / 颜色 */
  strength: number
}

/** 从分析结果提取打牌推荐（立直切牌也标在牌上）；鸣牌类见 callLabels */
export function tileHintsFromAnalysis (
  analysis: AnalysisSnapshot | null,
): Map<Pai, TileHint> {
  const best = new Map<Pai, number>()
  if (analysis === null) { return new Map() }

  for (const c of analysis.candidates) {
    if (c.score === null || c.score === undefined || Number.isNaN(c.score)) {
      continue
    }
    if (c.action === null || typeof c.action !== 'object') { continue }
    const a = c.action as { type?: string, pai?: Pai }
    // 打牌；立直若带切牌也标高度（文字「リーチ」另见 CallLabels）
    if (
      (a.type !== 'dahai' && a.type !== 'reach') ||
      a.pai === undefined
    ) {
      continue
    }
    const prev = best.get(a.pai)
    if (prev === undefined || c.score > prev) {
      best.set(a.pai, c.score)
    }
  }

  const sorted = [...best.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) { return new Map() }

  const scores = sorted.map(([, s]) => s)
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const span = max - min

  const out = new Map<Pai, TileHint>()
  sorted.forEach(([pai, score], rank) => {
    const strength = span < 1e-9 ? 1 : (score - min) / span
    out.set(pai, { score, rank, strength })
  })
  return out
}
