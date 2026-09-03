import { useEffect, useRef, useState } from 'react'

import type { AnalysisSnapshot, BoardSnapshot } from '../types'
import { actionsMatch } from '../utils/actionMatch'
import { inferMyAction, kyokuKey } from '../utils/inferMyAction'

export interface KyokuStats {
  /** 本局需要操作的次数（收到分析） */
  decisions: number
  top1Hits: number
  top2Hits: number
  top1Rate: number | null
  top2Rate: number | null
  kyokuLabel: string | null
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

/**
 * 一局内命中率。
 * 分母 = 收到分析的次数（需要你操作），不是牌局事件数。
 * 每条分析只对照一次实际行动。
 */
export function useKyokuStats (
  board: BoardSnapshot | null,
  analysis: AnalysisSnapshot | null,
): KyokuStats {
  const [stats, setStats] = useState<KyokuStats>(() => emptyStats(null))
  const prevBoard = useRef<BoardSnapshot | null>(null)
  const boardRef = useRef<BoardSnapshot | null>(null)
  const pendingRanked = useRef<unknown[] | null>(null)
  const pendingKyoku = useRef<string | null>(null)
  const armedAnalysis = useRef<AnalysisSnapshot | null>(null)
  const statsKyoku = useRef<string | null>(null)

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
      pendingRanked.current = null
      pendingKyoku.current = null
      armedAnalysis.current = null
      setStats(emptyStats(label))
    }

    const prev = prevBoard.current
    if (
      prev !== null &&
      pendingRanked.current !== null &&
      pendingKyoku.current === key
    ) {
      const actual = inferMyAction(prev, board)
      const ranked = pendingRanked.current
      const canPass = ranked.some(r =>
        r !== null &&
        typeof r === 'object' &&
        (r as { type?: string }).type === 'none',
      )
      // 未出现パス选项时，不要把「他家推进」误判成跳过
      const usable = actual !== null &&
        (actual.type !== 'none' || canPass)
      if (usable && actual !== null) {
        const hit1 = ranked[0] !== undefined && actionsMatch(ranked[0], actual)
        const hit2 = ranked.slice(0, 2).some(r => actionsMatch(r, actual))
        pendingRanked.current = null
        pendingKyoku.current = null
        setStats(s => {
          const top1Hits = s.top1Hits + (hit1 ? 1 : 0)
          const top2Hits = s.top2Hits + (hit2 ? 1 : 0)
          return {
            ...s,
            top1Hits,
            top2Hits,
            top1Rate: rate(top1Hits, s.decisions),
            top2Rate: rate(top2Hits, s.decisions),
            kyokuLabel: label,
          }
        })
      }
    }

    prevBoard.current = board
  }, [board])

  // 仅在「新的分析」到来时计入一次需要操作；不要绑 board，避免重挂 pending
  useEffect(() => {
    if (analysis === null) { return }
    if (armedAnalysis.current === analysis) { return }

    const boardNow = boardRef.current
    const key = boardNow !== null ? kyokuKey(boardNow) : null
    if (key === null) { return }

    armedAnalysis.current = analysis
    pendingRanked.current = rankedRecommendations(analysis)
    pendingKyoku.current = key

    const label = boardNow !== null ? formatKyokuLabel(boardNow) : null
    setStats(s => {
      const decisions = s.decisions + 1
      return {
        ...s,
        decisions,
        top1Rate: rate(s.top1Hits, decisions),
        top2Rate: rate(s.top2Hits, decisions),
        kyokuLabel: label ?? s.kyokuLabel,
      }
    })
  }, [analysis])

  return stats
}

export function formatRate (rateValue: number | null, hits: number, total: number): string {
  if (rateValue === null || total === 0) { return '—' }
  return `${(rateValue * 100).toFixed(0)}% (${hits}/${total})`
}
