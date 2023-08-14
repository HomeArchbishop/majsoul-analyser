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

class Analyser extends BaseAnalyser {
  analyseDiscard (round: Round): { choice: Tile, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const fulu = round.players[round.meSeat].fulu
    const anGang = round.players[round.meSeat].anGang
    const daraArgs = `-d=${formatTiles(round.doras.map(nextTile))}`
    const args = formatTiles(meHand) + '#' + fulu.map(formatTiles).join(' ') + ' ' + anGang.map(formatTiles).join(' ').toUpperCase()
    const out = shell.exec(`${binPath} ${daraArgs} ${args}`, { silent: true }).stdout
    const choiceName = out.match(/(?<=(切|ド)\s*?)\S*?(?=\s*?=>)/)
    if (choiceName !== null) {
      const choice = tile2nameSimplified(choiceName[0]) as Tile
      return { choice, info: `分析打出${choice}` }
    } else {
      logger.info(`<analyser> Got unexpected output: \`${out}\`, command: \`${binPath} ${daraArgs} ${args}\``)
      const choice = meHand[~~(Math.random() * meHand.length)]
      return { choice, info: `随机打出${choice}` }
    }
  }

  analyseChi (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    const meHand = round.players[round.meSeat].hand as Tile[]
    const fulu = round.players[round.meSeat].fulu
    const anGang = round.players[round.meSeat].anGang
    const daraArgs = `-d=${formatTiles(round.doras.map(nextTile))}`
    const args = formatTiles(meHand) + '#' + fulu.map(formatTiles).join(' ') + ' ' + anGang.map(formatTiles).join(' ').toUpperCase() + ' + ' + targetTile
    const out = shell.exec(`${binPath} ${daraArgs} ${args}`, { silent: true }).stdout
    const choiceLine = out.split('\n').find(l => l.match(/(无役)|(振听)/) === null && l.match(/=>/) !== null)
    if (choiceLine === undefined) {
      return { choice: false, info: '不副露' }
    }
    const choiceInfo = choiceLine.match(/(?<=\s)\S*?(切|ド)\s*?\S*?(?=\s*?=>)/)
    if (choiceInfo !== null) {
      return { choice: true, info: choiceInfo[0] }
    } else {
      return { choice: false, info: '不副露' }
    }
  }

  analysePeng (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    return this.analyseChi(round, targetTile)
  }

  analyseGang (round: Round, targetTile: Tile): { choice: boolean, info: string } {
    return this.analyseChi(round, targetTile)
  }

  analyseAnGang (round: Round, targetTile: Tile): { choice: boolean, info: string, discard: Tile } {
    const discard = this.analyseDiscard(round).choice
    const choice = discard === targetTile
    return { choice, info: '', discard }
  }

  analyseAddGang (round: Round, targetTile: Tile): { choice: boolean, info: string, discard: Tile } {
    const discard = this.analyseDiscard(round).choice
    const choice = discard === targetTile
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
