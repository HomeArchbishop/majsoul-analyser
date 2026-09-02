import type { Pai } from '../types'
import { Tile } from './Tile'

/** 表宝指示牌 5 枚，从左起依次翻开 */
const OUTER_DORA = 5

export function DoraWall ({ markers }: { markers: Pai[] }) {
  return (
    <div className='flex origin-center scale-[0.82] items-end gap-px'>
      {Array.from({ length: OUTER_DORA }, (_, i) => (
        <Tile
          key={i}
          pai={i < markers.length ? markers[i] : '?'}
          side='bottom'
          hidden={i >= markers.length}
        />
      ))}
    </div>
  )
}
