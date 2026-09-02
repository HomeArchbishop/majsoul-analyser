import type { Pai, TableSide } from '../types'
import { tileCell, tileImgDeg } from '../layout/table'
import { paiToTileSrc } from '../utils/paiToTile'

interface TileProps {
  pai: Pai
  side: TableSide
  lay?: boolean
  hidden?: boolean
}

export function Tile ({ pai, side, lay = false, hidden = false }: TileProps) {
  const deg = tileImgDeg(side, lay)
  const src = paiToTileSrc(hidden ? '?' : pai)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${tileCell(
        deg
      )}`}
    >
      <img
        src={src}
        alt={pai}
        className='h-7 w-5 rounded-[4px] object-contain'
        style={{ transform: `rotate(${deg}deg)` }}
        draggable={false}
      />
    </span>
  )
}
