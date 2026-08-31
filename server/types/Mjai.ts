/**
 * MJAI protocol types (https://riichi.dev/docs/protocol).
 * Control-plane messages (request_action, action_ack, …) are intentionally omitted.
 */

/** 数牌・字牌・赤牌・未知牌 */
export type Pai =
  | '1m' | '2m' | '3m' | '4m' | '5m' | '6m' | '7m' | '8m' | '9m'
  | '1p' | '2p' | '3p' | '4p' | '5p' | '6p' | '7p' | '8p' | '9p'
  | '1s' | '2s' | '3s' | '4s' | '5s' | '6s' | '7s' | '8s' | '9s'
  | '5mr' | '5pr' | '5sr'
  | 'E' | 'S' | 'W' | 'N'
  | 'P' | 'F' | 'C'
  | '?'

/** 场风 */
export type Kaze = 'E' | 'S' | 'W' | 'N'

/* ── Game events (牌谱事件流) ── */

export interface EventStartGame {
  type: 'start_game'
  id: number
}

export interface EventEndGame {
  type: 'end_game'
  scores?: number[]
}

export interface EventStartKyoku {
  type: 'start_kyoku'
  bakaze: Kaze
  dora_marker: Pai
  kyoku: number
  honba: number
  kyotaku: number
  oya: number
  scores: number[]
  tehais: Pai[][]
}

export interface EventEndKyoku {
  type: 'end_kyoku'
  scores?: number[]
}

export interface EventTsumo {
  type: 'tsumo'
  actor: number
  pai: Pai
}

export interface EventDahai {
  type: 'dahai'
  actor: number
  pai: Pai
  tsumogiri: boolean
}

export interface EventChi {
  type: 'chi'
  actor: number
  target: number
  pai: Pai
  consumed: Pai[]
}

export interface EventPon {
  type: 'pon'
  actor: number
  target: number
  pai: Pai
  consumed: Pai[]
}

export interface EventDaiminkan {
  type: 'daiminkan'
  actor: number
  target: number
  pai: Pai
  consumed: Pai[]
}

export interface EventAnkan {
  type: 'ankan'
  actor: number
  consumed: Pai[]
}

export interface EventKakan {
  type: 'kakan'
  actor: number
  pai: Pai
  consumed: Pai[]
}

export interface EventReach {
  type: 'reach'
  actor: number
}

export interface EventHora {
  type: 'hora'
  actor: number
  target?: number
  pai?: Pai
}

export interface EventRyukyoku {
  type: 'ryukyoku'
  reason?: string
}

export interface EventNuki {
  type: 'nuki'
  actor: number
}

/** 追加宝牌指示牌 */
export interface EventDora {
  type: 'dora'
  dora_marker: Pai
}

export type MjaiEvent =
  | EventStartGame
  | EventEndGame
  | EventStartKyoku
  | EventEndKyoku
  | EventTsumo
  | EventDahai
  | EventChi
  | EventPon
  | EventDaiminkan
  | EventAnkan
  | EventKakan
  | EventReach
  | EventHora
  | EventRyukyoku
  | EventNuki
  | EventDora

export type MjaiEventList = MjaiEvent[]

/* ── Action candidates (平台 operation_list 粗粒度候选项) ── */

export interface CandidateDahai { type: 'dahai' }
export interface CandidateChi { type: 'chi', consumedList: Pai[][] }
export interface CandidatePon { type: 'pon', consumedList: Pai[][] }
export interface CandidateKakan { type: 'kakan', consumedList: Pai[][] }
export interface CandidateDaiminkan { type: 'daiminkan', consumedList: Pai[][] }
export interface CandidateAnkan { type: 'ankan', consumedList: Pai[][] }
export interface CandidateReach { type: 'reach', pais: Pai[] }
export interface CandidateNuki { type: 'nuki' }
export interface CandidateHora { type: 'hora', tsumo?: boolean }
export interface CandidateRyukyoku { type: 'ryukyoku' }

export type ActionCandidate =
  | CandidateDahai
  | CandidateChi
  | CandidatePon
  | CandidateKakan
  | CandidateDaiminkan
  | CandidateAnkan
  | CandidateReach
  | CandidateNuki
  | CandidateHora
  | CandidateRyukyoku

export type ActionCandidateList = ActionCandidate[]

/* ── MJAI actions (完整合法动作，对应 possible_actions 子项) ── */

export interface ActionDahai {
  type: 'dahai'
  pai: Pai
  tsumogiri: boolean
}

export interface ActionChi {
  type: 'chi'
  target: number
  pai: Pai
  consumed: Pai[]
}

export interface ActionPon {
  type: 'pon'
  target: number
  pai: Pai
  consumed: Pai[]
}

export interface ActionKakan {
  type: 'kakan'
  pai: Pai
  consumed: Pai[]
}

export interface ActionDaiminkan {
  type: 'daiminkan'
  target: number
  pai: Pai
  consumed: Pai[]
}

export interface ActionAnkan {
  type: 'ankan'
  pai: Pai
  consumed: Pai[]
}

export interface ActionReach {
  type: 'reach'
  /** 立直宣言牌；雀魂等平台在 reach 与 dahai 合并选择时携带 */
  pai?: Pai
}

export interface ActionHora {
  type: 'hora'
  target?: number
  pai?: Pai
}

export interface ActionRyukyoku {
  type: 'ryukyoku'
}

export interface ActionNuki {
  type: 'nuki'
}

export interface ActionNone {
  type: 'none'
}

export type MjaiAction =
  | ActionDahai
  | ActionChi
  | ActionPon
  | ActionKakan
  | ActionDaiminkan
  | ActionAnkan
  | ActionReach
  | ActionHora
  | ActionRyukyoku
  | ActionNuki
  | ActionNone

export type MjaiActionList = MjaiAction[]
