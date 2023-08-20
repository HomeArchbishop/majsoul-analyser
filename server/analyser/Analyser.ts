import { type Round } from '../gameRecords/Round'
import { BaseAnalyser } from '../types/Analyser'
import { Tile } from '../types/General'
import shell from 'shelljs'
import path from 'path'
import { formatTiles } from '../utils/formatTiles'
import { tile2nameSimplified } from '../utils/tile2name'
import { nextTile } from '../utils/nextTile'
import os from 'node:os'
import logger from '../logger'

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

class Analyser extends BaseAnalyser {
  analyseDiscard (round: Round): { choice: Tile, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const fulu = round.players[round.meSeat].fulu
    const anGang = round.players[round.meSeat].anGang
    const daraArgs = `-d=${formatTiles(round.doras.map(nextTile)).replace(/\s/g, '')}`
    const args = formatTiles(meHand) + '#' + fulu.map(formatTiles).join(' ') + ' ' + anGang.map(formatTiles).join(' ').toUpperCase()
    const out = callMahjongHelperShell(`${binPath} ${daraArgs} ${args}`)
    const choiceName = out.split('\n').find(l => l.match(/(无役)|(振听)/) === null)?.match(/(?<=(切|ド)\s*?)\S*?(?=\s*?=>)/)
    if (choiceName !== null && choiceName !== undefined) {
      const choice = tile2nameSimplified(choiceName[0]) as Tile
      return { choice, info: `分析打出${choice}` }
    } else {
      logger.info(`<analyser> Got unexpected output: \`${out}\`, command: \`${binPath} ${daraArgs} ${args}\``)
      const choice = meHand[~~(Math.random() * meHand.length)]
      return { choice, info: `随机打出${choice}` }
    }
  }

  analyseChi (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    return { choice: false, info: '不副露' }
  }

  analysePeng (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const fulu = round.players[round.meSeat].fulu
    const anGang = round.players[round.meSeat].anGang
    const daraArgs = `-d=${formatTiles(round.doras.map(nextTile))}`
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
      const choiceInfo = fuluLine.line.match(/(?<=\s)\S*?(切|ド)\s*?\S*?(?=\s*?=>)/)
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
        const choiceInfo = fuluLine.line.match(/(?<=\s)\S*?(切|ド)\s*?\S*?(?=\s*?=>)/)
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
  }

  analyseGang (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    if (targetTile === '5z' || targetTile === '6z' || targetTile === '7z' || Number(targetTile[0]) === (round.changfeng + 1) % 4 || Number(targetTile[0]) === (round.zifeng + 1) % 4) {
      return { choice: true, info: '杠' + targetTile }
    }
    return { choice: false, info: '不副露' }
  }

  analyseAnGang (round: Round, targetTile: Tile): { choice: boolean, info: string, discard: Tile } {
    const discard = this.analyseDiscard(round).choice
    const choice = discard === targetTile
    return { choice, info: '', discard }
  }

  analyseAddGang (round: Round, targetTile: Tile): { choice: boolean, info: string, discard: Tile } {
    const discard = this.analyseDiscard(round).choice
    const choice = discard !== targetTile
    return { choice, info: '', discard }
  }

  analyseLiqi (round: Round): { choice: boolean, discard: Tile, info: string } {
    const choice = round.leftTileCnt >= 10
    const discard = this.analyseDiscard(round).choice
    const info = (choice ? '立直 ' : '默听 ') + `切${discard}`
    return { choice, discard, info }
  }

  analyseHule (round: Round): { choice: boolean, info: string } {
    const choice = true
    return { choice, info: '荣和' }
  }

  analyseZimo (round: Round): { choice: boolean, info: string } {
    const choice = true
    return { choice, info: '自摸' }
  }

  analyseBabei (round: Round): { choice: boolean, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const choice = meHand.reduce((p, c) => { c === '3z' ? p += 1 : p += 0; return p }, 0) < 3
    return { choice, info: '拔北' }
  }
}

export { Analyser }
