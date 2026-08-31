import { Round } from '../gameRecords/Round'
import { Pai } from '../types/Mjai'
import { formatPai } from '../utils/pai'

const KAZE_LABEL: Record<string, string> = { E: '东', S: '南', W: '西', N: '北' }

function roundState (round: Round): string {
  let text = ''
  text += `${KAZE_LABEL[round.bakaze]}${round.kyoku}局${round.honba}本场 场风${KAZE_LABEL[round.bakaze]} 庄位${round.oya}\n`
  text += `宝牌指示${round.doraMarkers.join(' ')}\n`
  for (let i = 0; i < round.players.length; i++) {
    const player = round.players[(round.meSeat + i) % 4]
    text += ['自家', '下家', '对家', '上家'][i] + '\n'
    if ((round.meSeat + i) % 4 === round.meSeat) {
      text += formatPai(player.hand)
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
