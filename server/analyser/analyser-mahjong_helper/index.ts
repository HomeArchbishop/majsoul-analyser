import { type Round } from '../../gameRecords/Round'
import { BaseAnalyser } from '../../types/Analyser'
import { Tile } from '../../types/General'
import shell from 'shelljs'
import path from 'path'
import { formatTiles } from '../../utils/formatTiles'
import { tile2nameSimplified } from '../../utils/tile2name'
import { nextTile } from '../../utils/nextTile'
import os from 'node:os'
import logger from '../../logger'
import { OperationDahai, ParsedOperation, ParsedOperationList } from '../../types/ParsedOperation'

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
  let cmd: any = {}
  cmd = shell.exec(command, { silent: true, timeout: 3900 })
  const stdout = cmd.stdout
  return stdout
}

const operationJudge: Record<string, (round: Round, targetTile?: Tile) => { choice: boolean, info?: string, discard?: Tile }> = {
  dahai: function analyseDiscard (round: Round): { choice: true, discard: Tile, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const fulu = round.players[round.meSeat].fulu
    const anGang = round.players[round.meSeat].ankan
    const daraArgs = `-d=${formatTiles(round.doraMarkers.map(nextTile)).replace(/\s/g, '')}`
    const args = formatTiles(meHand) + '#' + fulu.map(formatTiles).join(' ') + ' ' + anGang.map(formatTiles).join(' ').toUpperCase()
    const out = callMahjongHelperShell(`${binPath} ${daraArgs} ${args}`)
    const choiceName = out.split('\n').find(l => l.match(/无役/) === null && l.match(/(?<=(切|ド)\s*?)\S*?(?=\s*?=>)/) !== null)?.match(/(?<=(切|ド)\s*?)\S*?(?=\s*?=>)/)
    if (choiceName !== null && choiceName !== undefined) {
      const discard = tile2nameSimplified(choiceName[0]) as Tile
      return { choice: true, discard, info: `分析打出${discard}` }
    } else {
      logger.info(`<analyser> Got unexpected output: \`${out}\`, command: \`${binPath} ${daraArgs} ${args}\``)
      const discard = meHand[~~(Math.random() * meHand.length)]
      return { choice: true, discard, info: `随机打出${discard}` }
    }
  },

  chi: function analyseChi (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    return { choice: false, info: '不副露' }
  },

  pon: function analysePeng (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const fulu = round.players[round.meSeat].fulu
    const anGang = round.players[round.meSeat].ankan
    const daraArgs = `-d=${formatTiles(round.doraMarkers.map(nextTile)).replace(/\s/g, '')}`
    const args = formatTiles(meHand) + '#' + fulu.map(formatTiles).join(' ') + ' ' + anGang.map(formatTiles).join(' ').toUpperCase() + ' + ' + targetTile
    const out = callMahjongHelperShell(`${binPath} ${daraArgs} ${args}`)
    const currentLine = {
      line: out.split('\n').find((l, i, a) => l.match(/(无役)|(振听)/) === null && i > 0 && a[i - 1].match(/当前/) !== null),
      title: out.split('\n').find(l => l.match(/当前/) !== null)
    }
    const fuluLine = {
      line: out.split('\n').find(l => l.match(/(无役)|(振听)/) === null && l.match(/=>/) !== null && l.match(/碰/) !== null),
      tile: out.split('\n').find(l => l.match(/鸣牌后/) !== null)
    }
    if (currentLine.line === undefined && fuluLine.line === undefined) {
      return { choice: false, info: '不副露' }
    }
    if (currentLine.line === undefined && fuluLine.line !== undefined) {
      const choiceInfo = fuluLine.line.match(/(?<=\s)\S*?(?=(切|ド)\s*?\S*?\s*?=>)/)
      if (choiceInfo !== null) {
        return { choice: true, info: choiceInfo[0] }
      } else {
        return { choice: false, info: '不副露' }
      }
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
        } else {
          return { choice: false, info: '不副露' }
        }
      } else {
        return { choice: false, info: '不副露' }
      }
    }
    return { choice: false, info: '不副露' }
  },

  daiminkan: function analyseGang (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    if (targetTile === '5z' || targetTile === '6z' || targetTile === '7z' || targetTile === round.bakaze || Number(targetTile[0]) === (round.meSeat - round.oya) % 4 + 1) {
      return { choice: true, info: '杠' + targetTile }
    }
    return { choice: false, info: '不副露' }
  },

  ankan: function analyseAnGang (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    const discard = operationJudge.dahai(round).discard
    const choice = discard === targetTile
    return { choice, info: '' }
  },

  kakan: function analyseAddGang (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    const discard = operationJudge.dahai(round).discard
    const choice = discard !== targetTile
    return { choice, info: '' }
  },

  reach: function analyseLiqi (round: Round): { choice: boolean, discard: Tile, info: string } {
    const choice = round.leftTileCnt >= 10
    const discard = operationJudge.dahai(round).discard as Tile
    const info = (choice ? '立直 ' : '默听 ') + `切${discard}`
    return { choice, discard, info }
  },

  horaron: function analyseHule (round: Round): { choice: boolean, info: string } {
    const choice = true
    return { choice, info: '荣和' }
  },

  horatsumo: function analyseZimo (round: Round): { choice: boolean, info: string } {
    const choice = true
    return { choice, info: '自摸' }
  },

  babei: function analyseBabei (round: Round): { choice: boolean, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const choice = meHand.reduce((p, c) => { c === '3z' ? p += 1 : p += 0; return p }, 0) < 3
    return { choice, info: '拔北' }
  },

  skip: function analyseSkip (round: Round): { choice: true, info: string } {
    return { choice: true, info: 'skip' }
  }
}

class Analyser extends BaseAnalyser {
  async analyseOperations (parsedOperationList: ParsedOperationList, round: Round): Promise<{ choice: ParsedOperation, info?: string }> {
    if (parsedOperationList.length === 0) { return { choice: { type: 'skip' }, info: 'No operation to analyse' } }
    const priority = ['horatsumo', 'horaron', 'reach', 'chi', 'pon', 'ankan', 'daiminkan', 'kakan', 'babei', 'dahai', 'skip']
    parsedOperationList
      .sort(({ type: t1 }, { type: t2 }) => priority.findIndex(n => n === t1) - priority.findIndex(n => n === t2))
    const handledOperationType: Array<ParsedOperation['type']> = []
    for (const parsedOperation of parsedOperationList) {
      if (handledOperationType.includes(parsedOperation.type)) { continue }
      handledOperationType.push(parsedOperation.type)
      const judgeResult = operationJudge[parsedOperation.type](round, 'pai' in parsedOperation ? parsedOperation.pai : undefined)
      if (judgeResult.choice) {
        if (parsedOperation.type === 'dahai') {
          return {
            choice: {
              ...parsedOperation,
              pai: judgeResult.discard as Tile,
              tsumogiri: (parsedOperationList.find(o => o.type === 'dahai' && o.pai === judgeResult.discard) as OperationDahai)?.tsumogiri ?? false
            },
            info: judgeResult.info
          }
        } else if (parsedOperation.type === 'reach') {
          return {
            choice: { ...parsedOperation, pai: judgeResult.discard as Tile }, info: judgeResult.info
          }
        } else {
          return {
            choice: parsedOperation, info: judgeResult.info
          }
        }
      }
    }
    /* Logically, by no means will the code following run */
    return {
      choice: parsedOperationList[~~(Math.random() * parsedOperationList.length)],
      info: 'Random selection'
    }
  }
}

export default new Analyser()
