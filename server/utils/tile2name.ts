function tile2name (tile: string): string {
  if (tile.match(/[a-z]/) != null) {
    return tile.replace(/s/g, '索')
      .replace(/p/g, '餅')
      .replace(/m/g, '萬')
      .replace(/1z/g, '東')
      .replace(/2z/g, '南')
      .replace(/3z/g, '西')
      .replace(/4z/g, '北')
      .replace(/5z/g, '白')
      .replace(/6z/g, '發')
      .replace(/7z/g, '中')
      .replace(/0z/g, '赤5')
  } else {
    return tile
      .replace(/索/g, 's')
      .replace(/餅/g, 'p')
      .replace(/萬/g, 'm')
      .replace(/東/g, '1z')
      .replace(/南/g, '2z')
      .replace(/西/g, '3z')
      .replace(/北/g, '4z')
      .replace(/白/g, '5z')
      .replace(/發/g, '6z')
      .replace(/中/g, '7z')
      .replace(/赤5/g, '0')
  }
}

function tile2nameSimplified (tile: string): string {
  if (tile.match(/[a-z]/) != null) {
    return tile
      .replace(/s/g, '索')
      .replace(/p/g, '饼')
      .replace(/m/g, '万')
      .replace(/1z/g, '东')
      .replace(/2z/g, '南')
      .replace(/3z/g, '西')
      .replace(/4z/g, '北')
      .replace(/5z/g, '白')
      .replace(/6z/g, '发')
      .replace(/7z/g, '中')
      .replace(/0z/g, '赤5')
  } else {
    return tile.replace(/索/g, 's')
      .replace(/饼/g, 'p')
      .replace(/万/g, 'm')
      .replace(/东/g, '1z')
      .replace(/南/g, '2z')
      .replace(/西/g, '3z')
      .replace(/北/g, '4z')
      .replace(/白/g, '5z')
      .replace(/发/g, '6z')
      .replace(/中/g, '7z')
      .replace(/赤5/g, '0')
  }
}

export { tile2name, tile2nameSimplified }
