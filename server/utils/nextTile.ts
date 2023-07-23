import { Tile } from '../types/General'

function nextTile (tile: Tile): Tile {
  return String((+tile[0] + 1) % 9) + tile[1] as Tile
}

export { nextTile }
