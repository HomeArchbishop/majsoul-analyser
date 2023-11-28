import { Round } from '../gameRecords/Round'
import { Tile } from './General'

export abstract class BaseAnalyser {
  abstract analyseDiscard (round: Round): { choice: Tile, info: string }

  abstract analyseChi (round: Round, targetTile: Tile): { choice: boolean, info: string }

  abstract analysePeng (round: Round, targetTile: Tile): { choice: boolean, info: string }

  abstract analyseGang (round: Round, targetTile: Tile): { choice: boolean, info: string }

  abstract analyseAnGang (round: Round, targetTile: Tile): { choice: boolean, info: string, discard: Tile }

  abstract analyseAddGang (round: Round, targetTile: Tile): { choice: boolean, info: string, discard: Tile }

  abstract analyseLiqi (round: Round): { choice: boolean, discard: Tile, info: string }

  abstract analyseHule (round: Round): { choice: boolean, info: string }

  abstract analyseZimo (round: Round): { choice: boolean, info: string }

  abstract analyseBabei (round: Round): { choice: boolean, info: string }
}
