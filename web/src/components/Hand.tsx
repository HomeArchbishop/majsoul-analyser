import type { ReactNode } from 'react'
import type { Pai, TableSide } from '../types'
import { flexDir, GAP, HALF_GAP, handLayout, tileCell, tileImgDeg } from '../layout/table'
import type { TileHint } from '../utils/tileHints'
import { sortedTehai } from '../utils/sortPai'
import { ScoreMark, ScoreMarkSlot } from './ScoreMark'
import { Tile } from './Tile'

interface HandProps {
  side: TableSide
  tehai: Pai[]
  tsumoPai?: Pai | null
  hidden?: boolean
  reachHandLayIndex?: number | null
  /** 自家手牌上方推荐标记（按牌面） */
  tileHints?: Map<Pai, TileHint>
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

function MarkedTile ({
  pai,
  side,
  lay,
  hidden,
  hint,
}: {
  pai: Pai
  side: TableSide
  lay?: boolean
  hidden?: boolean
  hint?: TileHint
}) {
  return (
    <span className='inline-flex flex-col items-center justify-end'>
      {hint !== undefined
        ? <ScoreMark hint={hint} />
        : <ScoreMarkSlot />}
      <Tile pai={pai} side={side} lay={lay} hidden={hidden} />
    </span>
  )
}

export function Hand ({
  side,
  tehai,
  tsumoPai = null,
  hidden = false,
  reachHandLayIndex = null,
  tileHints,
}: HandProps) {
  const hand = handLayout(side)
  const hasTsumo = tsumoPai !== null
  // 自家始终占位柱槽，避免分数出现/消失时撑高抖动
  const reserveMarks = tileHints !== undefined && !hidden
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

  const hintOf = (pai: Pai) => reserveMarks ? tileHints.get(pai) : undefined

  const bodyStrip = body.length > 0
    ? (
        <HandStrip dir={hand.dir} rev={hand.rev} gap={GAP}>
          {body.map((pai, i) => (
            reserveMarks
              ? (
                  <MarkedTile
                    key={i}
                    pai={pai}
                    side={side}
                    hidden={hidden}
                    lay={reachHandLayIndex !== null && i === reachHandLayIndex}
                    hint={hintOf(pai)}
                  />
                )
              : (
                  <Tile
                    key={i}
                    pai={pai}
                    side={side}
                    hidden={hidden}
                    lay={reachHandLayIndex !== null && i === reachHandLayIndex}
                  />
                )
          ))}
        </HandStrip>
      )
    : null

  const tsumoStrip = (
    <HandStrip dir={hand.dir} gap={GAP}>
      {tsumo !== null
        ? (
            reserveMarks
              ? (
                  <MarkedTile
                    pai={tsumo}
                    side={side}
                    hidden={hidden}
                    hint={hintOf(tsumo)}
                  />
                )
              : <Tile pai={tsumo} side={side} hidden={hidden} />
          )
        : (
            <span
              className='inline-flex shrink-0 flex-col items-center justify-end'
              aria-hidden
            >
              {reserveMarks && <ScoreMarkSlot />}
              <span className={tileCell(tileImgDeg(side, false))} />
            </span>
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
