import type { AnalysisSnapshot, BoardSnapshot } from '../types'
import { callLabelsFromAnalysis } from '../utils/callLabels'
import { tileHintsFromAnalysis } from '../utils/tileHints'
import { CallLabels } from './CallLabels'
import { Hand } from './Hand'

/** 小窗：只有自家手牌候选（分数条 + 鸣牌标签） */
export function CompactView ({
  snapshot,
  analysis,
}: {
  snapshot: BoardSnapshot
  analysis: AnalysisSnapshot | null
}) {
  const round = snapshot.round
  const me = round?.players.find(p => p.seat === snapshot.meSeat)

  if (round === undefined || round === null || me === undefined) {
    return (
      <div className='flex flex-1 items-center justify-center text-sm text-gray-600'>
        等待牌局…
      </div>
    )
  }

  return (
    <div className='flex flex-1 items-end justify-center px-8 pb-3 pt-16'>
      <div className='relative inline-flex'>
        <Hand
          side='bottom'
          tehai={me.tehai}
          tsumoPai={me.tsumoPai}
          tileHints={tileHintsFromAnalysis(analysis)}
          reachHandLayIndex={
            me.reached && me.reachRiverIndex === null
              ? me.reachHandLayIndex
              : null
          }
        />
        <CallLabels labels={callLabelsFromAnalysis(analysis)} />
      </div>
    </div>
  )
}
