import type { Pai } from '@/types/Mjai'
import { paiMatches, sortPai } from '@/utils/pai'

/** 立直宣言后的横置位（UI；随事件增量维护，避免每帧重放） */
export interface ReachLayState {
  reachHandLayIndex: number | null
  reachRiverIndex: number | null
}

export function emptyReachLay (): ReachLayState {
  return { reachHandLayIndex: null, reachRiverIndex: null }
}

/** 立直后第一打：手牌横置槽 + 河牌宣言位 */
export function declareReachLay (
  lay: ReachLayState,
  tehaiBeforeDiscard: Pai[],
  discard: Pai,
  riverIndexAfterPush: number,
): void {
  if (lay.reachHandLayIndex !== null) { return }
  const sorted = sortPai([...tehaiBeforeDiscard])
  let idx = sorted.findIndex(t => paiMatches(t, discard))
  if (idx < 0) { idx = Math.max(0, sorted.length - 1) }
  const maxAfterDiscard = Math.max(0, sorted.length - 2)
  lay.reachHandLayIndex = Math.min(idx, maxAfterDiscard)
  lay.reachRiverIndex = riverIndexAfterPush
}

function sortedRemoveIndices (tehai: Pai[], consumed: Pai[]): number[] {
  const sorted = sortPai([...tehai])
  const used = new Set<number>()
  const out: number[] = []
  for (const c of consumed) {
    for (let i = 0; i < sorted.length; i++) {
      if (!used.has(i) && paiMatches(sorted[i], c)) {
        used.add(i)
        out.push(i)
        break
      }
    }
  }
  return out
}

/** 自家副露/杠：按排序手牌中被取走的下标左移横置槽 */
export function shiftReachHandLayExact (
  lay: ReachLayState,
  tehaiBeforeRemove: Pai[],
  consumed: Pai[],
): void {
  if (lay.reachHandLayIndex === null) { return }
  for (const ri of sortedRemoveIndices(tehaiBeforeRemove, consumed).sort((a, b) => a - b)) {
    if (ri < lay.reachHandLayIndex) { lay.reachHandLayIndex-- }
  }
}

/** 他家：只知道张数时按数量左移 */
export function shiftReachHandLayByCount (lay: ReachLayState, count: number): void {
  if (lay.reachHandLayIndex === null) { return }
  lay.reachHandLayIndex = Math.max(0, lay.reachHandLayIndex - count)
}

/** 立直宣言牌被吃碰杠拿走 */
export function clearReachRiverIfTaken (lay: ReachLayState, riverLenBeforePop: number): void {
  if (lay.reachRiverIndex !== null && lay.reachRiverIndex === riverLenBeforePop - 1) {
    lay.reachRiverIndex = null
  }
}
