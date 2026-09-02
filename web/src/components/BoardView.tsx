import type { BoardSnapshot, PlayerSnapshot } from '../types'
import {
  CENTER_GRID,
  riverPlaceholderClass,
  seatCell,
} from '../layout/table'
import { MetaHub, type MetaHubProps } from './MetaHub'
import { RiverSlot } from './River'
import { Seat } from './Seat'
import type { TableSide } from '../types'

const SIDES: TableSide[] = ['bottom', 'right', 'top', 'left']

interface SeatView {
  player: PlayerSnapshot
  side: TableSide
  isMe: boolean
}

function Center ({
  round,
  seats
}: {
  round: NonNullable<BoardSnapshot['round']>
  seats: Record<TableSide, SeatView | undefined>
}) {
  const slot = (side: TableSide) => {
    const s = seats[side]
    return s !== undefined ? (
      <RiverSlot
        tiles={s.player.sutehai}
        side={side}
        reachRiverIndex={s.player.reachRiverIndex}
      />
    ) : (
      <div className={riverPlaceholderClass(side)} />
    )
  }

  const hubSeats: MetaHubProps['seats'] = {}
  for (const side of SIDES) {
    const s = seats[side]
    if (s !== undefined) {
      hubSeats[side] = {
        seat: s.player.seat,
        isMe: s.isMe,
        reached: s.player.reached,
        score: round.scores?.[s.player.seat],
      }
    }
  }

  return (
    <div
      className={`inline-grid shrink-0 ${CENTER_GRID} items-center justify-items-center gap-4`}
    >
      <div />
      {slot('top')}
      <div />
      {slot('left')}
      <MetaHub round={round} seats={hubSeats} />
      {slot('right')}
      <div />
      {slot('bottom')}
      <div />
    </div>
  )
}

export function BoardView ({ snapshot }: { snapshot: BoardSnapshot }) {
  const round = snapshot.round
  if (round === null) {
    return (
      <div className='flex flex-1 items-center justify-center text-sm text-gray-600'>
        等待牌局…
      </div>
    )
  }

  const n = round.players.length
  const bySide = {} as Record<TableSide, SeatView | undefined>
  for (const side of SIDES) {
    bySide[side] = undefined
  }

  for (const player of round.players) {
    const rel = (player.seat - snapshot.meSeat + n) % n
    bySide[SIDES[rel]] = {
      player,
      side: SIDES[rel],
      isMe: player.seat === snapshot.meSeat
    }
  }

  const outer = (side: TableSide) => {
    const s = bySide[side]
    if (s === undefined) {
      return null
    }
    return <Seat player={s.player} side={side} isMe={s.isMe} />
  }

  return (
    <div className='flex flex-1 items-center justify-center p-3'>
      <div className='aspect-square max-h-[min(100%,calc(100vh-8rem))] max-w-[min(100%,calc(100vh-8rem))]'>
        <div className='grid grid-cols-[auto_auto_auto] grid-rows-[auto_auto_auto] items-center justify-center gap-2'>
          <div />
          <div className={seatCell('top')}>{outer('top')}</div>
          <div />
          <div className={seatCell('left')}>{outer('left')}</div>
          <Center round={round} seats={bySide} />
          <div className={seatCell('right')}>{outer('right')}</div>
          <div />
          <div className={seatCell('bottom')}>{outer('bottom')}</div>
          <div />
        </div>
      </div>
    </div>
  )
}
