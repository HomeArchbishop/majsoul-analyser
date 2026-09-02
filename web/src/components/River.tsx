import type { Pai, TableSide } from '../types'
import { flexDir, GAP, riverChunks, riverLayout, riverSlotClass } from '../layout/table'
import { Tile } from './Tile'

function River ({
  tiles,
  side,
  reachRiverIndex = null,
}: {
  tiles: Pai[]
  side: TableSide
  reachRiverIndex?: number | null
}) {
  if (tiles.length === 0) {
    return null
  }

  const cfg = riverLayout(side)
  const chunks = riverChunks(tiles)

  return (
    <div
      className={`flex ${flexDir(cfg.stack, cfg.stackRev)}`}
      style={{ gap: GAP }}
    >
      {chunks.map((line, li) => {
        const lineStart = chunks
          .slice(0, li)
          .reduce((sum, chunk) => sum + chunk.length, 0)
        return (
          <div
            key={li}
            className={`flex ${flexDir(cfg.line, cfg.lineRev)}`}
            style={{ gap: GAP }}
          >
            {line.map((pai, ti) => (
              <Tile
                key={ti}
                pai={pai}
                side={side}
                lay={
                  reachRiverIndex !== null && lineStart + ti === reachRiverIndex
                }
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function RiverSlot ({
  tiles,
  side,
  reachRiverIndex = null,
}: {
  tiles: Pai[]
  side: TableSide
  reachRiverIndex?: number | null
}) {
  return (
    <div className={riverSlotClass(side)}>
      <River tiles={tiles} side={side} reachRiverIndex={reachRiverIndex} />
    </div>
  )
}
