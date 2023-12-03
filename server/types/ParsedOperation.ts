/**
 * Protocol follows https://mjai.app/docs/mjai-protocol
 * But DO notice:
 * - Wind (風牌; Kazehai): "E" "S" "W" "N" -> "1z" "2z" "3z" "4z"
 * - Dragon (三元牌; Sangenpai): "P" "F" "C" -> "5z" "6z" "7z" "8z"
 * - Red doragon (赤ドラ; Akadora): "5mr" "5pr" "5sr" -> "0m" "0p" "0r"
 */

import { Tile } from './General'

export interface RoughOperationDahai {
  type: 'dahai'
}

export interface RoughOperationPon {
  type: 'pon'
  consumedList: Tile[][]
}

export interface RoughOperationChi {
  type: 'chi'
  consumedList: Tile[][]
}

export interface RoughOperationKakan {
  type: 'kakan'
  consumedList: Tile[][]
}

export interface RoughOperationDaiminkan {
  type: 'daiminkan'
  consumedList: Tile[][]
}

export interface RoughOperationAnkan {
  type: 'ankan'
  consumedList: Tile[][]
}

export interface RoughOperationReach {
  type: 'reach'
  pais: Tile[]
}

export interface RoughOperationBabei {
  type: 'babei'
}

export interface RoughOperationHoraRon {
  type: 'horaron'
}

export interface RoughOperationHoraTsumo {
  type: 'horatsumo'
}

export interface RoughOperationRyukyoku {
  type: 'ryukyoku'
}

export type ParsedRoughOperation = RoughOperationDahai | RoughOperationPon | RoughOperationChi | RoughOperationKakan | RoughOperationBabei |
RoughOperationDaiminkan | RoughOperationAnkan | RoughOperationReach | RoughOperationRyukyoku | RoughOperationHoraTsumo | RoughOperationHoraRon
export type ParsedRoughOperationList = ParsedRoughOperation[]

export interface OperationDahai {
  type: 'dahai'
  pai: Tile
  tsumogiri: boolean
}

export interface OperationPon {
  type: 'pon'
  target: number
  pai: Tile
  consumed: Tile[]
}

export interface OperationChi {
  type: 'chi'
  target: number
  pai: Tile
  consumed: Tile[]
}

export interface OperationKakan {
  type: 'kakan'
  pai: Tile
  consumed: Tile[]
}

export interface OperationDaiminkan {
  type: 'daiminkan'
  target: number
  pai: Tile
  consumed: Tile[]
}

export interface OperationAnkan {
  type: 'ankan'
  pai: Tile
  consumed: Tile[]
}

export interface OperationReach {
  type: 'reach'
  pai: Tile
}

export interface OperationBabei {
  type: 'babei'
}

export interface OperationHoraRon {
  type: 'horaron'
  target: number
}

export interface OperationHoraTsumo {
  type: 'horatsumo'
}

export interface OperationRyukyoku {
  type: 'ryukyoku'
}

export interface OperationSkip {
  type: 'skip'
}

export type ParsedOperation = OperationDahai | OperationPon | OperationChi | OperationKakan | OperationBabei |
OperationDaiminkan | OperationAnkan | OperationReach | OperationRyukyoku | OperationHoraTsumo | OperationHoraRon |
OperationSkip
export type ParsedOperationList = ParsedOperation[]
