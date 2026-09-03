import type { Pai } from '../types'

type Action = Record<string, unknown>

function asAction (v: unknown): Action | null {
  if (v === null || typeof v !== 'object') { return null }
  return v as Action
}

function deaka (pai: string): string {
  if (pai === '5mr') { return '5m' }
  if (pai === '5pr') { return '5p' }
  if (pai === '5sr') { return '5s' }
  return pai
}

function paiEq (a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') { return a === b }
  return a === b || deaka(a) === deaka(b)
}

function consumedEq (a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return a === b
  }
  const sa = [...a].map(String).map(deaka).sort()
  const sb = [...b].map(String).map(deaka).sort()
  return sa.every((v, i) => v === sb[i])
}

/** 推荐 vs 实际：同类型且关键字段一致（打牌忽略摸切；赤宝等价） */
export function actionsMatch (recommended: unknown, actual: unknown): boolean {
  const r = asAction(recommended)
  const a = asAction(actual)
  if (r === null || a === null) { return false }
  if (r.type !== a.type) { return false }

  switch (r.type) {
    case 'none':
    case 'nuki':
    case 'ryukyoku':
      return true
    case 'dahai':
      return paiEq(r.pai, a.pai)
    case 'reach':
      // 推荐带切牌时比对；仅 type 也算立直命中
      if (r.pai === undefined || a.pai === undefined) { return true }
      return paiEq(r.pai, a.pai)
    case 'chi':
    case 'pon':
    case 'daiminkan':
      return paiEq(r.pai, a.pai) && consumedEq(r.consumed, a.consumed)
    case 'ankan':
      return consumedEq(r.consumed, a.consumed) ||
        paiEq(
          Array.isArray(r.consumed) ? r.consumed[0] : undefined,
          Array.isArray(a.consumed) ? a.consumed[0] : undefined,
        )
    case 'kakan':
      return paiEq(r.pai, a.pai)
    case 'hora': {
      const rTsumo = r.target === undefined
      const aTsumo = a.target === undefined
      if (rTsumo !== aTsumo) { return false }
      if (r.pai !== undefined && a.pai !== undefined) { return paiEq(r.pai, a.pai) }
      return true
    }
    default:
      return JSON.stringify(r) === JSON.stringify(a)
  }
}

export type InferredAction =
  | { type: 'dahai', pai: Pai, tsumogiri?: boolean }
  | { type: 'chi', pai: Pai, consumed: Pai[] }
  | { type: 'pon', pai: Pai, consumed: Pai[] }
  | { type: 'daiminkan', pai: Pai, consumed: Pai[] }
  | { type: 'ankan', consumed: Pai[] }
  | { type: 'kakan', pai: Pai }
  | { type: 'reach', pai?: Pai }
  | { type: 'nuki' }
  | { type: 'none' }
  | { type: 'hora', pai?: Pai, target?: number }
