import { Round } from '../gameRecords/Round'
import { Tile } from '../types/General'
import { formatTiles } from '../utils/formatTiles'

const feng = ['东', '南', '西', '北']

function roundState (round: Round): string {
  let text = ''
  text += `${feng[+round.bakaze.slice(0, 1) - 1]}${round.kyoku + 1}局${round.honba + 1}本場 場風${feng[+round.bakaze.slice(0, 1) - 1]} 莊位${round.oya}\n`
  text += `寶牌指示${round.doraMarkers.join(' ')}\n`
  for (let i = 0; i < round.players.length; i++) {
    const player = round.players[(round.meSeat + i) % 4]
    text += ['自家', '下家', '對家', '上家'][i] + '\n'
    if ((round.meSeat + i) % 4 === round.meSeat) {
      text += formatTiles(player.hand as Tile[])
    }
    if (player.ankan.length > 0) {
      text += `(${player.ankan.map(t => t.join('')).join(' ')})`
    }
    if (player.fulu.length > 0) {
      text += ' # ' + player.fulu.map(t => t.join('')).join(' ')
    }
    text += '\n'
    text += '河: ' + player.he.join('') + '\n'
    text += '切: ' + player.discards.join('') + '\n'
  }
  return text
}

export { roundState }
