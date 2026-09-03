import type { AnalysisSnapshot, PlayerSnapshot, TableSide } from '../types'
import { flexBoxClass, HALF_GAP } from '../layout/table'
import { callLabelsFromAnalysis } from '../utils/callLabels'
import { tileHintsFromAnalysis } from '../utils/tileHints'
import { CallLabels } from './CallLabels'
import { Hand } from './Hand'
import { Melds } from './Meld'

export function Seat ({
  player,
  side,
  isMe,
  analysis = null,
}: {
  player: PlayerSnapshot
  side: TableSide
  isMe: boolean
  analysis?: AnalysisSnapshot | null
}) {
  const melds = [...player.furo, ...player.ankan].reverse()
  const tileHints = isMe ? tileHintsFromAnalysis(analysis) : undefined
  const callLabels = isMe ? callLabelsFromAnalysis(analysis) : []

  return (
    <div className={flexBoxClass(side)} style={{ gap: HALF_GAP }}>
      <div className='relative inline-flex shrink-0'>
        <Hand
          side={side}
          tehai={player.tehai}
          tsumoPai={player.tsumoPai}
          hidden={!isMe}
          tileHints={tileHints}
          reachHandLayIndex={
            player.reached && player.reachRiverIndex === null
              ? player.reachHandLayIndex
              : null
          }
        />
        {isMe && <CallLabels labels={callLabels} />}
      </div>
      <Melds side={side} melds={melds} />
    </div>
  )
}
