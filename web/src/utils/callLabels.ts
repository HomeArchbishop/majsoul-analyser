import type { AnalysisSnapshot } from '../types'
import { isSameAction } from './formatAction'

export interface CallLabel {
  key: string
  text: string
  recommended: boolean
  score: number | null
}

const TYPE_JA: Record<string, string> = {
  none: 'パス',
  chi: 'チー',
  pon: 'ポン',
  daiminkan: 'カン',
  ankan: 'カン',
  kakan: 'カン',
  reach: 'リーチ',
  ryukyoku: '流局',
  nuki: '抜き',
}

const ORDER = ['パス', 'チー', 'ポン', 'カン', 'リーチ', 'ツモ', 'ロン', '抜き', '流局']

function labelForAction (action: unknown): string | null {
  if (action === null || typeof action !== 'object') { return null }
  const a = action as { type?: string, target?: number }
  if (a.type === undefined || a.type === 'dahai') { return null }
  if (a.type === 'hora') {
    return a.target === undefined ? 'ツモ' : 'ロン'
  }
  return TYPE_JA[a.type] ?? null
}

function groupKey (action: unknown, text: string): string {
  const type = (action as { type: string }).type
  // 各类カン合并；ツモ/ロン用文案区分
  if (type === 'daiminkan' || type === 'ankan' || type === 'kakan') { return 'kan' }
  if (type === 'hora') { return text }
  return type
}

/** 跳过 / 鸣牌 / 立直 / 和了等：日语标签（打牌除外） */
export function callLabelsFromAnalysis (
  analysis: AnalysisSnapshot | null,
): CallLabel[] {
  if (analysis === null) { return [] }

  const choiceText = labelForAction(analysis.choice)
  const byKey = new Map<string, CallLabel>()

  for (const c of analysis.candidates) {
    const text = labelForAction(c.action)
    if (text === null) { continue }
    const key = groupKey(c.action, text)
    const recommended = isSameAction(c.action, analysis.choice) ||
      (choiceText !== null && text === choiceText)
    const score = c.score ?? null
    const prev = byKey.get(key)
    if (prev === undefined) {
      byKey.set(key, { key, text, recommended, score })
      continue
    }
    byKey.set(key, {
      key,
      text,
      recommended: prev.recommended || recommended,
      score: prev.score == null
        ? score
        : score == null
          ? prev.score
          : Math.max(prev.score, score),
    })
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.recommended !== b.recommended) { return a.recommended ? -1 : 1 }
    return ORDER.indexOf(a.text) - ORDER.indexOf(b.text)
  })
}
