import type { ReactNode } from 'react'
import type { Pai, TableSide } from '../types'
import { flexDir, GAP, HALF_GAP, handLayout, tileCell, tileImgDeg } from '../layout/table'
import { sortedTehai } from '../utils/sortPai'
import { Tile } from './Tile'

interface HandProps {
  side: TableSide
  tehai: Pai[]
  tsumoPai?: Pai | null
  hidden?: boolean
  reachHandLayIndex?: number | null
}

function HandStrip ({
  dir,
  rev,
  gap,
  children,
}: {
  dir: 'row' | 'col'
  rev?: boolean
  gap?: string
  children: ReactNode
}) {
  return (
    <div
      className={`flex flex-nowrap items-end ${flexDir(dir, rev ?? false)}`}
      style={{ gap }}
    >
      {children}
    </div>
  )
}

export function Hand ({
  side,
  tehai,
  tsumoPai = null,
  hidden = false,
  reachHandLayIndex = null,
}: HandProps) {
  const hand = handLayout(side)
  const hasTsumo = tsumoPai !== null
  const { body, tsumo } = hidden
    ? {
        body: Array.from(
          { length: hasTsumo ? Math.max(0, tehai.length - 1) : tehai.length },
          () => '?' as Pai,
        ),
        tsumo: hasTsumo ? ('?' as Pai) : null,
      }
    : sortedTehai(tehai, tsumoPai)

  if (body.length === 0 && tsumo === null) {
    return null
  }

  const bodyStrip = body.length > 0
    ? (
        <HandStrip dir={hand.dir} rev={hand.rev} gap={GAP}>
          {body.map((pai, i) => (
            <Tile
              key={i}
              pai={pai}
              side={side}
              hidden={hidden}
              lay={reachHandLayIndex !== null && i === reachHandLayIndex}
            />
          ))}
        </HandStrip>
      )
    : null

  const tsumoStrip = (
    <HandStrip dir={hand.dir} gap={GAP}>
      {tsumo !== null
        ? <Tile pai={tsumo} side={side} hidden={hidden} />
        : (
            <span
              className={`inline-block shrink-0 ${tileCell(tileImgDeg(side, false))}`}
              aria-hidden
            />
          )}
    </HandStrip>
  )

  if (bodyStrip === null) {
    return tsumoStrip
  }

  const ordered = hand.tsumoInside
    ? <>{bodyStrip}{tsumoStrip}</>
    : <>{tsumoStrip}{bodyStrip}</>

  return (
    <div
      className={`flex shrink-0 items-end ${flexDir(hand.dir, false)}`}
      style={{ gap: HALF_GAP }}
    >
      {ordered}
    </div>
  )
}
