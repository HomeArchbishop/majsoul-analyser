import { Tile } from '../types/General'

function formatTiles (tiles: Tile[]): string {
  return (JSON.parse(JSON.stringify(tiles)) as Tile[])
    .sort((a, b) => {
      if (a.charCodeAt(1) === b.charCodeAt(1)) {
        return a.replace('0', '5').charCodeAt(0) - b.replace('0', '5').charCodeAt(0)
      } else {
        return a.charCodeAt(1) - b.charCodeAt(1)
      }
    })
    .reduce((p, c, i, a) => {
      if (i >= a.length - 1 || a[i + 1][1] !== a[i][1]) { p += c + ' ' } else { p += c[0] }
      return p
    }, '')
    .slice(0, -1)
}

export { formatTiles }
