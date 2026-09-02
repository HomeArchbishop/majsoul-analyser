import type { MeldSnapshot, TableSide } from '../types'
import {
  flexBoxClass,
  GAP,
  kanStackLayout,
  meldStackPair,
  meldTileState,
} from '../layout/table'
import { Tile } from './Tile'

function KanStack ({
  side,
  calledPai,
  stackPai,
}: {
  side: TableSide
  calledPai: MeldSnapshot['tiles'][number]
  stackPai: MeldSnapshot['tiles'][number]
}) {
  const { boxClass, order } = kanStackLayout(side)
  const called = <Tile pai={calledPai} side={side} lay />
  const stacked = <Tile pai={stackPai} side={side} lay />

  return (
    <div className={boxClass} style={{ gap: GAP }}>
      {order === 'stack-first' ? <>{stacked}{called}</> : <>{called}{stacked}</>}
    </div>
  )
}

function MeldTiles ({
  meld,
  side,
}: {
  meld: MeldSnapshot
  side: TableSide
}) {
  const { tiles } = meld
  const pair = meldStackPair(meld)

  return (
    <>
      {tiles.map((pai, j) => {
        const state = meldTileState(meld, j)
        if (state.skip) { return null }

        if (pair !== null && j === pair.base) {
          return (
            <KanStack
              key={j}
              side={side}
              calledPai={pai}
              stackPai={tiles[pair.stack]}
            />
          )
        }

        return (
          <span key={j} className='inline-flex shrink-0'>
            <Tile
              pai={pai}
              side={side}
              lay={state.lay}
              hidden={state.hidden}
            />
          </span>
        )
      })}
    </>
  )
}

export function Melds ({
  side,
  melds,
}: {
  side: TableSide
  melds: MeldSnapshot[]
}) {
  if (melds.length === 0) { return null }

  const box = flexBoxClass(side)

  return (
    <div className={box} style={{ gap: GAP }}>
      {melds.map((m, i) => (
        <div key={i} className={box} style={{ gap: GAP }}>
          <MeldTiles meld={m} side={side} />
        </div>
      ))}
    </div>
  )
}
