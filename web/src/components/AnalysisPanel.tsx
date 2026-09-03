import type { AnalysisSnapshot } from '../types'
import { formatRate, type KyokuStats } from '../hooks/useKyokuStats'
import { formatAction } from '../utils/formatAction'

interface AnalysisPanelProps {
  analysis: AnalysisSnapshot | null
  kyokuStats: KyokuStats
}

export function AnalysisPanel ({ analysis, kyokuStats }: AnalysisPanelProps) {
  return (
    <footer className='border-t border-gray-800/60 px-4 py-2 text-xs text-gray-500'>
      <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
        {kyokuStats.kyokuLabel !== null && (
          <span className='text-gray-600'>{kyokuStats.kyokuLabel}</span>
        )}
        <span>
          <span className='text-gray-600'>一选 </span>
          <span className='tabular-nums text-gray-300'>
            {formatRate(kyokuStats.top1Rate, kyokuStats.top1Hits, kyokuStats.decisions)}
          </span>
        </span>
        <span>
          <span className='text-gray-600'>前二 </span>
          <span className='tabular-nums text-gray-300'>
            {formatRate(kyokuStats.top2Rate, kyokuStats.top2Hits, kyokuStats.decisions)}
          </span>
        </span>
        {analysis !== null && (
          <span>
            <span className='text-gray-600'>推荐 </span>
            <span className='text-gray-300'>{formatAction(analysis.choice)}</span>
          </span>
        )}
        {analysis !== null && analysis.info !== '' && (
          <span className='truncate text-gray-600'>{analysis.info}</span>
        )}
        {analysis === null && kyokuStats.decisions === 0 && (
          <span className='text-gray-600'>等待分析…</span>
        )}
      </div>
    </footer>
  )
}
