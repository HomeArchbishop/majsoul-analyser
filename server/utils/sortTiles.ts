import { Tile } from '../types/General'

function sortTiles (tiles: Tile[]): Tile[] {
  return (JSON.parse(JSON.stringify(tiles)) as Tile[])
    .sort((a, b) => {
      if (a.charCodeAt(1) === b.charCodeAt(1)) {
        return a.replace('0', '5').charCodeAt(0) - b.replace('0', '5').charCodeAt(0)
      } else {
        return a.charCodeAt(1) - b.charCodeAt(1)
      }
    })
}

export { sortTiles }
