import { Tile } from '../types/General'

function tenhouNum2Tile (num: number): Tile {
  const tileKanji = ['m', 'p', 's', 'z'][~~(num / 36)]
  if (num === 16 || num === 52 || num === 88) {
    return `0${tileKanji}` as Tile
  }
  const tileNum = ~~(num % 36 / 4) + 1
  return `${tileNum}${tileKanji}` as Tile
}

export { tenhouNum2Tile }
