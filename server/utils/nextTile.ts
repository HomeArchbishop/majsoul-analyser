import { Tile } from '../types/General'

function nextTile (tile: Tile): Tile {
  if (tile.endsWith('z')) {
    return String((+tile[0] + 1) % 7) + tile[1] as Tile
  } else {
    return String((+tile[0] + 1) % 9) + tile[1] as Tile
  }
}

export { nextTile }
