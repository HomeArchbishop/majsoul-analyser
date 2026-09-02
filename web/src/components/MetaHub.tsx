import type { ReactNode } from 'react'
import type { RoundSnapshot, TableSide } from '../types'
import { seatTileDeg } from '../layout/table'
import { DoraWall } from './DoraWall'

const BAKAZE: Record<string, string> = { E: '东', S: '南', W: '西', N: '北' }

/** 各家标签贴在中心外缘，朝外 */
const SIDE_ANCHOR: Record<TableSide, string> = {
  top: 'left-1/2 top-0 -translate-x-1/2',
  bottom: 'left-1/2 bottom-0 -translate-x-1/2',
  left: 'left-0 top-1/2 -translate-y-1/2',
  right: 'right-0 top-1/2 -translate-y-1/2',
}

const SIDES: TableSide[] = ['top', 'right', 'bottom', 'left']

function FacingLabel ({
  side,
  className,
  children,
}: {
  side: TableSide
  className?: string
  children: ReactNode
}) {
  const deg = seatTileDeg(side)
  return (
    <span
      className={`inline-block whitespace-nowrap ${className ?? ''}`}
      style={{ transform: `rotate(${deg}deg)` }}
    >
      {children}
    </span>
  )
}

function SideHud ({
  side,
  seat,
  oya,
  isMe,
  reached,
  score,
}: {
  side: TableSide
  seat: number
  oya: number
  isMe: boolean
  reached: boolean
  score?: number
}) {
  return (
    <div className={`absolute ${SIDE_ANCHOR[side]}`}>
      <FacingLabel
        side={side}
        className={`rounded bg-black/40 px-1.5 py-0.5 text-center leading-tight ${
          isMe ? 'text-gray-200' : 'text-gray-400'
        }`}
      >
        <div className='text-[0.6rem]'>
          P{seat}
          {seat === oya && <span className='ml-0.5'>親</span>}
          {reached && <span className='ml-0.5'>立</span>}
        </div>
        {score !== undefined && (
          <div className={`text-[0.55rem] tabular-nums ${
            isMe ? 'text-gray-300' : 'text-gray-500'
          }`}
          >
            {score.toLocaleString()}
          </div>
        )}
      </FacingLabel>
    </div>
  )
}

export interface MetaHubProps {
  round: RoundSnapshot
  seats: Partial<Record<TableSide, {
    seat: number
    isMe: boolean
    reached: boolean
    score?: number
  }>>
}

export function MetaHub ({ round, seats }: MetaHubProps) {
  const bakaze = BAKAZE[round.bakaze] ?? round.bakaze

  return (
    <div className='relative h-[9.75rem] w-[9.75rem] shrink-0 rounded-sm bg-hub'>
      {SIDES.map((side) => {
        const s = seats[side]
        if (s === undefined) { return null }
        return (
          <SideHud
            key={side}
            side={side}
            seat={s.seat}
            oya={round.oya}
            isMe={s.isMe}
            reached={s.reached}
            score={s.score}
          />
        )
      })}
      <div className='absolute inset-7 flex flex-col items-center justify-center gap-1 text-center'>
        <div className='text-xs text-gray-300'>{bakaze}{round.kyoku}局</div>
        <div className='text-[0.6rem] leading-snug text-gray-600'>
          供托{round.kyotaku} · {round.honba}本 · 残{round.tilesLeft}
        </div>
        <DoraWall markers={round.doraMarkers} />
      </div>
    </div>
  )
}
