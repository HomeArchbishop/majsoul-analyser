import { useEffect, useRef, useState } from 'react'

import type { AnalysisSnapshot, BoardSnapshot } from '../types'
import { actionsMatch, type InferredAction } from '../utils/actionMatch'
import { inferMyAction, kyokuKey, othersCalledMeld } from '../utils/inferMyAction'

export interface KyokuStats {
  /** 本局已结算的选择次数 */
  decisions: number
  top1Hits: number
  top2Hits: number
  top1Rate: number | null
  top2Rate: number | null
  kyokuLabel: string | null
}

interface PendingDecision {
  ranked: unknown[]
  kyoku: string
  /** 候选里是否有 none（可 skip） */
  allowsSkip: boolean
}

function emptyStats (label: string | null): KyokuStats {
  return {
    decisions: 0,
    top1Hits: 0,
    top2Hits: 0,
    top1Rate: null,
    top2Rate: null,
    kyokuLabel: label,
  }
}

function rate (hits: number, total: number): number | null {
  if (total <= 0) { return null }
  return hits / total
}

function formatKyokuLabel (board: BoardSnapshot): string | null {
  const r = board.round
  if (r === null) { return null }
  const wind: Record<string, string> = { E: '东', S: '南', W: '西', N: '北' }
  const w = wind[r.bakaze] ?? r.bakaze
  const honba = r.honba > 0 ? ` ${r.honba}本场` : ''
  return `${w}${r.kyoku}局${honba}`
}

function rankedRecommendations (analysis: AnalysisSnapshot): unknown[] {
  const scored = analysis.candidates.filter(
    c => c.score !== null && c.score !== undefined && !Number.isNaN(c.score),
  )
  if (scored.length > 0) {
    return [...scored]
      .sort((a, b) => (b.score as number) - (a.score as number))
      .map(c => c.action)
  }
  const rest = analysis.candidates
    .map(c => c.action)
    .filter(a => !actionsMatch(a, analysis.choice))
  return [analysis.choice, ...rest]
}

function isNoneAction (action: unknown): boolean {
  return action !== null &&
    typeof action === 'object' &&
    (action as { type?: string }).type === 'none'
}

function isPositiveMyAction (action: InferredAction): boolean {
  return action.type !== 'none'
}

/** skip 后轮到自己摸牌：上一帧无摸牌，这一帧有 */
function iJustTsumoed (prev: BoardSnapshot, next: BoardSnapshot): boolean {
  if (prev.round === null || next.round === null) { return false }
  if (prev.meSeat < 0) { return false }
  const a = prev.round.players.find(p => p.seat === prev.meSeat)
  const b = next.round.players.find(p => p.seat === next.meSeat)
  if (a === undefined || b === undefined) { return false }
  return a.tsumoPai === null && b.tsumoPai !== null &&
    a.furo.length === b.furo.length &&
    a.ankan.length === b.ankan.length &&
    a.sutehai.length === b.sutehai.length
}

function applySettle (
  s: KyokuStats,
  ranked: unknown[],
  actual: InferredAction,
  label: string | null,
): KyokuStats {
  const decisions = s.decisions + 1
  const hit1 = ranked[0] !== undefined && actionsMatch(ranked[0], actual)
  const hit2 = ranked.slice(0, 2).some(r => actionsMatch(r, actual))
  const top1Hits = s.top1Hits + (hit1 ? 1 : 0)
  const top2Hits = s.top2Hits + (hit2 ? 1 : 0)
  return {
    ...s,
    decisions,
    top1Hits,
    top2Hits,
    top1Rate: rate(top1Hits, decisions),
    top2Rate: rate(top2Hits, decisions),
    kyokuLabel: label ?? s.kyokuLabel,
  }
}

/**
 * 一局内一选/二选率。
 *
 * 规则：分子、分母只在「选择已作出」时一起更新。
 * - 收到 analysis → 只挂起 pending，不动统计
 * - 打牌/鸣牌/立直等落地 → 结算
 * - skip（候选含 none，且自己未鸣）：
 *   · 局面推进自己没动，或
 *   · 随后自己摸牌，或
 *   · 下一次 analysis 到来而本次尚未结算
 * - 抢碰（他家先鸣）→ 丢弃 pending，不计入
 */
export function useKyokuStats (
  board: BoardSnapshot | null,
  analysis: AnalysisSnapshot | null,
): KyokuStats {
  const [stats, setStats] = useState<KyokuStats>(() => emptyStats(null))
  const prevBoard = useRef<BoardSnapshot | null>(null)
  const boardRef = useRef<BoardSnapshot | null>(null)
  const pending = useRef<PendingDecision | null>(null)
  const armedAnalysis = useRef<AnalysisSnapshot | null>(null)
  const statsKyoku = useRef<string | null>(null)

  const settle = (
    ranked: unknown[],
    actual: InferredAction,
    label: string | null,
  ) => {
    pending.current = null
    setStats(s => applySettle(s, ranked, actual, label))
  }

  const dropPending = () => {
    pending.current = null
  }

  useEffect(() => {
    boardRef.current = board
    if (board === null) {
      prevBoard.current = null
      return
    }

    const key = kyokuKey(board)
    const label = formatKyokuLabel(board)

    if (key !== null && key !== statsKyoku.current) {
      statsKyoku.current = key
      pending.current = null
      armedAnalysis.current = null
      setStats(emptyStats(label))
    }

    const prev = prevBoard.current
    const p = pending.current
    if (prev !== null && p !== null && p.kyoku === key) {
      if (othersCalledMeld(prev, board)) {
        // 抢碰：机会被别人拿走，不算自己的选择
        dropPending()
      } else {
        const actual = inferMyAction(prev, board)
        if (actual !== null && isPositiveMyAction(actual)) {
          settle(p.ranked, actual, label)
        } else if (
          p.allowsSkip &&
          (
            (actual !== null && actual.type === 'none') ||
            iJustTsumoed(prev, board)
          )
        ) {
          settle(p.ranked, { type: 'none' }, label)
        }
      }
    }

    prevBoard.current = board
  }, [board])

  useEffect(() => {
    if (analysis === null) { return }
    if (armedAnalysis.current === analysis) { return }

    const boardNow = boardRef.current
    const key = boardNow !== null ? kyokuKey(boardNow) : null
    if (key === null) { return }

    const label = boardNow !== null ? formatKyokuLabel(boardNow) : null
    const prevPending = pending.current

    // 新决策点到来：若上一决策还可 skip 且尚未结算 → 视为已 skip
    if (
      prevPending !== null &&
      prevPending.kyoku === key &&
      prevPending.allowsSkip
    ) {
      settle(prevPending.ranked, { type: 'none' }, label)
    } else if (prevPending !== null) {
      dropPending()
    }

    armedAnalysis.current = analysis
    const ranked = rankedRecommendations(analysis)
    pending.current = {
      ranked,
      kyoku: key,
      allowsSkip: ranked.some(isNoneAction),
    }
  }, [analysis])

  return stats
}

export function formatRate (rateValue: number | null, hits: number, total: number): string {
  if (rateValue === null || total === 0) { return '—' }
  return `${(rateValue * 100).toFixed(0)}% (${hits}/${total})`
}
