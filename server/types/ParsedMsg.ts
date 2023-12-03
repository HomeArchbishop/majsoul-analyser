/**
 * Protocol follows https://mjai.app/docs/mjai-protocol
 * But DO notice:
 * - Wind (風牌; Kazehai): "E" "S" "W" "N" -> "1z" "2z" "3z" "4z"
 * - Dragon (三元牌; Sangenpai): "P" "F" "C" -> "5z" "6z" "7z" "8z"
 * - Red doragon (赤ドラ; Akadora): "5mr" "5pr" "5sr" -> "0m" "0p" "0r"
 */

import { Tile } from './General'

export interface MsgStartGame {
  type: 'start_game'
  id: number
}

export interface MsgEndGame {
  type: 'end_game'
}

export interface MsgStartKyoku {
  type: 'start_kyoku'
  bakaze: '1z' | '2z' | '3z' | '4z'
  dora_marker: Tile
  kyoku: number // 局
  honba: number // 本場
  kyotaku: number // 供託
  scores: number[]
  oya: number // 親 (庄)
  tehais: Array<Array<(Tile | '?')>>
}

export interface MsgEndKyoku {
  type: 'end_kyoku'
}

export interface MsgTsumo {
  type: 'tsumo'
  actor: number
  pai: Tile | '?'
}

export interface MsgDahai {
  type: 'dahai'
  actor: number
  pai: Tile
  tsumogiri: boolean
}

export interface MsgPon {
  type: 'pon'
  actor: number
  target: number
  pai: Tile
  consumed: Tile[]
}

export interface MsgChi {
  type: 'chi'
  actor: number
  target: number
  pai: Tile
  consumed: Tile[]
}

export interface MsgKakan {
  type: 'kakan'
  actor: number
  pai: Tile
  consumed: Tile[]
}

export interface MsgDaiminkan {
  type: 'daiminkan'
  actor: number
  target: number
  pai: Tile
  consumed: Tile[]
}

export interface MsgAnkan {
  type: 'ankan'
  actor: number
  consumed: Tile[]
}

export interface MsgReach {
  type: 'reach'
  actor: number
}

export interface MsgBabei {
  type: 'babei'
  actor: number
}

export interface MsgDora {
  type: 'dora'
  dora_marker: Tile
}

export interface MsgHora {
  type: 'hora'
  actor: number
  target: number
  pai?: Tile // if exist ? ron : tsumo
}

export interface MsgRyukyoku {
  type: 'ryukyoku'
}

export type ParsedMsg = MsgStartGame | MsgEndGame | MsgStartKyoku |
MsgEndKyoku | MsgTsumo | MsgDahai | MsgPon | MsgChi | MsgKakan | MsgBabei |
MsgDaiminkan | MsgAnkan | MsgReach | MsgDora

export type ParsedMsgList = ParsedMsg[]
