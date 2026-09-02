import type { AnalysisSnapshot } from '../types'
import { formatAction, isSameAction } from '../utils/formatAction'

interface AnalysisPanelProps {
  analysis: AnalysisSnapshot | null
}

export function AnalysisPanel ({ analysis }: AnalysisPanelProps) {
  if (analysis === null) {
    return (
      <footer className='border-t border-gray-800/60 px-4 py-2 text-xs text-gray-600'>
        等待分析…
      </footer>
    )
  }

  return (
    <footer className='border-t border-gray-800/60 px-4 py-2 text-xs text-gray-500'>
      <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
        <span>
          <span className='text-gray-600'>推荐 </span>
          <span className='text-gray-300'>{formatAction(analysis.choice)}</span>
        </span>
        {analysis.info !== '' && (
          <span className='text-gray-600'>{analysis.info}</span>
        )}
      </div>
      {analysis.candidates.length > 1 && (
        <div className='mt-1.5 flex flex-wrap gap-2'>
          {analysis.candidates.map((candidate, index) => {
            const selected = isSameAction(candidate, analysis.choice)
            return (
              <span
                key={index}
                className={selected ? 'text-gray-300' : 'text-gray-600'}
              >
                {formatAction(candidate)}
              </span>
            )
          })}
        </div>
      )}
    </footer>
  )
}
