import os from 'node:os'

import path from 'path'
import shell from 'shelljs'

import { type Round } from '../../gameRecords/Round'
import logger from '../../logger'
import { BaseAnalyser } from '../../types/Analyser'
import type { MjaiAction, MjaiActionList } from '../../types/Mjai'
import { Pai } from '../../types/Mjai'
import { formatPai, helperLabelToPai, nextPai } from '../../utils/pai'

let binPath: string

const platform = os.platform()
if (platform === 'darwin') {
  binPath = path.resolve(__dirname, './mahjong-helper')
} else if (platform === 'win32') {
  binPath = path.resolve(__dirname, './mahjong-helper.exe')
} else {
  throw new Error('This program only supports Darwin or Windows, but found ' + platform)
}

function callMahjongHelperShell (command: string): string {
  const cmd = shell.exec(command, { silent: true, timeout: 3900 })
  return cmd.stdout
}

const operationJudge: Record<string, (round: Round, targetPai?: Pai) => { choice: boolean, info?: string, discard?: Pai }> = {
  dahai: function analyseDahai (round: Round): { choice: true, discard: Pai, info: string } {
    const meHand = round.players[round.meSeat].hand
    const fulu = round.players[round.meSeat].fulu
    const ankan = round.players[round.meSeat].ankan
    const doraArgs = `-d=${formatPai(round.doraMarkers.map(nextPai)).replace(/\s/g, '')}`
    const args = formatPai(meHand) + '#' + fulu.map(formatPai).join(' ') + ' ' + ankan.map(formatPai).join(' ').toUpperCase()
    const out = callMahjongHelperShell(`${binPath} ${doraArgs} ${args}`)
    const choiceName = out.split('\n').find(l => l.match(/无役/) === null && l.match(/(?<=(切|ド)\s*?)\S*?(?=\s*?=>)/) !== null)?.match(/(?<=(切|ド)\s*?)\S*?(?=\s*?=>)/)
    if (choiceName !== null && choiceName !== undefined) {
      const discard = helperLabelToPai(choiceName[0])
      return { choice: true, discard, info: `分析打出${discard}` }
    }
    logger.info(`<analyser> Got unexpected output: \`${out}\`, command: \`${binPath} ${doraArgs} ${args}\``)
    const discard = meHand[~~(Math.random() * meHand.length)]
    return { choice: true, discard, info: `随机打出${discard}` }
  },

  chi: function analyseChi (): { choice: boolean, info: string } {
    return { choice: false, info: '不副露' }
  },

  pon: function analysePon (round: Round, targetPai?: Pai): { choice: boolean, info: string } {
    const meHand = round.players[round.meSeat].hand
    const fulu = round.players[round.meSeat].fulu
    const ankan = round.players[round.meSeat].ankan
    const doraArgs = `-d=${formatPai(round.doraMarkers.map(nextPai)).replace(/\s/g, '')}`
    const args = formatPai(meHand) + '#' + fulu.map(formatPai).join(' ') + ' ' + ankan.map(formatPai).join(' ').toUpperCase() + ' + ' + (targetPai ?? '')
    const out = callMahjongHelperShell(`${binPath} ${doraArgs} ${args}`)
    const currentLine = {
      line: out.split('\n').find((l, i, a) => l.match(/(无役)|(振听)/) === null && i > 0 && a[i - 1].match(/当前/) !== null),
      title: out.split('\n').find(l => l.match(/当前/) !== null),
    }
    const fuluLine = {
      line: out.split('\n').find(l => l.match(/(无役)|(振听)/) === null && l.match(/=>/) !== null && l.match(/碰/) !== null),
      tile: out.split('\n').find(l => l.match(/鸣牌后/) !== null),
    }
    if (currentLine.line === undefined && fuluLine.line === undefined) {
      return { choice: false, info: '不副露' }
    }
    if (currentLine.line === undefined && fuluLine.line !== undefined) {
      const choiceInfo = fuluLine.line.match(/(?<=\s)\S*?(?=(切|ド)\s*?\S*?\s*?=>)/)
      if (choiceInfo !== null) {
        return { choice: true, info: choiceInfo[0] }
      }
      return { choice: false, info: '不副露' }
    }
    if (currentLine.line !== undefined && fuluLine.line === undefined) {
      return { choice: false, info: '不副露' }
    }
    if (currentLine.line !== undefined && fuluLine.line !== undefined) {
      const currentMark = +(currentLine.line.match(/^\s*\d+/) ?? [-1])[0]
      const fuluMark = +(fuluLine.line.match(/^\s*\d+/) ?? [-1])[0]
      if (currentMark <= fuluMark) {
        const choiceInfo = fuluLine.line.match(/(?<=\s)\S*?(?=(切|ド)\s*?\S*?\s*?=>)/)
        if (choiceInfo !== null) {
          return { choice: true, info: choiceInfo[0] }
        }
        return { choice: false, info: '不副露' }
      }
      return { choice: false, info: '不副露' }
    }
    return { choice: false, info: '不副露' }
  },

  daiminkan: function analyseDaiminkan (round: Round, targetPai?: Pai): { choice: boolean, info: string } {
    if (targetPai === 'P' || targetPai === 'F' || targetPai === 'C' || targetPai === round.bakaze ||
      (targetPai !== undefined && targetPai.length === 2 && Number(targetPai[0]) === (round.meSeat - round.oya) % 4 + 1)) {
      return { choice: true, info: '杠' + targetPai }
    }
    return { choice: false, info: '不副露' }
  },

  ankan: function analyseAnkan (round: Round, targetPai?: Pai): { choice: boolean, info: string } {
    const discard = operationJudge.dahai(round).discard
    const choice = discard === targetPai
    return { choice, info: '' }
  },

  kakan: function analyseKakan (round: Round, targetPai?: Pai): { choice: boolean, info: string } {
    const discard = operationJudge.dahai(round).discard
    const choice = discard !== targetPai
    return { choice, info: '' }
  },

  reach: function analyseReach (round: Round): { choice: boolean, discard: Pai, info: string } {
    const choice = round.leftTileCnt >= 10
    const discard = operationJudge.dahai(round).discard as Pai
    const info = (choice ? '立直 ' : '默听 ') + `切${discard}`
    return { choice, discard, info }
  },

  hora: function analyseHora (): { choice: boolean, info: string } {
    return { choice: true, info: '和牌' }
  },

  nuki: function analyseNuki (round: Round): { choice: boolean, info: string } {
    const meHand = round.players[round.meSeat].hand
    const choice = meHand.reduce((p, c) => { c === 'N' ? p += 1 : p += 0; return p }, 0) < 3
    return { choice, info: '拔北' }
  },

  ryukyoku: function analyseRyukyoku (): { choice: true, info: string } {
    return { choice: true, info: 'ryukyoku' }
  },

  none: function analyseNone (): { choice: true, info: string } {
    return { choice: true, info: 'none' }
  },
}

class Analyser extends BaseAnalyser {
  async analyseOperations (mjaiActionList: MjaiActionList, round: Round): Promise<{ choice: MjaiAction, info?: string }> {
    if (mjaiActionList.length === 0) { return { choice: { type: 'none' }, info: 'No operation to analyse' } }
    const priority = ['hora', 'reach', 'chi', 'pon', 'ankan', 'daiminkan', 'kakan', 'nuki', 'dahai', 'ryukyoku', 'none']
    mjaiActionList.sort(({ type: t1 }, { type: t2 }) => priority.findIndex(n => n === t1) - priority.findIndex(n => n === t2))
    const handledTypes: Array<MjaiAction['type']> = []
    for (const action of mjaiActionList) {
      if (handledTypes.includes(action.type)) { continue }
      handledTypes.push(action.type)
      const judgeResult = operationJudge[action.type](round, 'pai' in action ? action.pai : undefined)
      if (judgeResult.choice) {
        if (action.type === 'dahai') {
          return {
            choice: {
              ...action,
              pai: judgeResult.discard as Pai,
              tsumogiri: (mjaiActionList.find(o => o.type === 'dahai' && o.pai === judgeResult.discard) as { tsumogiri?: boolean })?.tsumogiri ?? false,
            },
            info: judgeResult.info,
          }
        }
        if (action.type === 'reach') {
          return {
            choice: { ...action, pai: judgeResult.discard as Pai },
            info: judgeResult.info,
          }
        }
        return { choice: action, info: judgeResult.info }
      }
    }
    return {
      choice: mjaiActionList[~~(Math.random() * mjaiActionList.length)],
      info: 'Random selection',
    }
  }
}

export default new Analyser()
