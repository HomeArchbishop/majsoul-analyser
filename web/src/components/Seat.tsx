import type { PlayerSnapshot, TableSide } from '../types'
import { flexBoxClass, HALF_GAP } from '../layout/table'
import { Hand } from './Hand'
import { Melds } from './Meld'

export function Seat ({
  player,
  side,
  isMe,
}: {
  player: PlayerSnapshot
  side: TableSide
  isMe: boolean
}) {
  const melds = [...player.furo, ...player.ankan].reverse()

  return (
    <div className={flexBoxClass(side)} style={{ gap: HALF_GAP }}>
      <Hand
        side={side}
        tehai={player.tehai}
        tsumoPai={player.tsumoPai}
        hidden={!isMe}
        reachHandLayIndex={
          player.reached && player.reachRiverIndex === null
            ? player.reachHandLayIndex
            : null
        }
      />
      <Melds side={side} melds={melds} />
    </div>
  )
}
