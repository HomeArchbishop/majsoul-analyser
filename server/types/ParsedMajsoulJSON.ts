import type { Tile } from './General'

// === below: Actions ===
export interface OptionalOperationList {
  seat: number
  time_add: number
  time_fixed: number
  operation_list: OptionalOperation[]
}
export interface OptionalOperation {
  type: number
  // discard: 1, chi: 2, peng: 3, angang: 4, gang: 5, addgang: 6,
  // liqi: 7, zimo: 8, hule(ron): 9, jiuzhongjiupai: 10, babei: 11,
  // huansanzhang: 12, dingque: 13: reveal: 14
  combination: string[] // such as ['5s|5s', '0s'|'5s']
  // 6liqi => [ '7z', '7z' ] 出一张7z立直
  // 2chi => ['5s|5s', '0s'|'5s'] 与这些吃
  // 3/5peng gang => ['5s|5s|5s', '0s'|'5s'] 与这些碰
}
export interface LiQiSuccess {
  seat: number
  score: number
  liqibang: number
}
export interface TingPaiInfo {
  tile: Tile
  haveyi: boolean
  yiman: boolean
  count: number
  fu: number
  biao_dora_count: number
}
export interface HuleInfo {
  hand: Tile[]
  ming: Tile[]
  hu_tile: Tile
  seat: number
  zimo: boolean
  qinjia: boolean
  liqi: boolean
  doras: Tile[]
  li_doras: Tile[]
  yiman: boolean
  count: number
  fans: Array<{
    name: string
    val: number
    id: number
  }>
  fu: number
  title: string
  point_rong: number
  point_zimo_qin: number
  point_zimo_xian: number
  title_id: number
  point_sum: number
}

export interface ActionNewRound {
  chang: number
  ju: number
  ben: number
  liqibang: number
  tiles: Tile[]
  doras: Tile[]
  dora: Tile[] // useless
  scores: number[]
  operation: OptionalOperationList | null
  tingpais0: Array<{
    tile: Tile
    zhenting: boolean
    infos: TingPaiInfo[]
  }>
  tingpais1: TingPaiInfo[]
  al: boolean
  left_tile_count: number
}
export interface ActionAnGangAddGang {
  seat: number
  type: number
  tiles: Tile
  doras: Tile[]
  zhenting: boolean
  tingpais: TingPaiInfo[]
  operation: OptionalOperationList | null
}
export interface ActionBaBei {
  seat: number
  doras: Tile[]
  zhenting: boolean
  operation: OptionalOperationList | null
  tingpais: TingPaiInfo[]
}
export interface ActionChiPengGang {
  seat: number
  doras: Tile[]
  zhenting: boolean
  type: number // 0: chi, 1: peng, 2: gang
  tiles: Tile[] // [ '1s', '2s', '3s' ]
  froms: number[] // [ 1, 1, 0 ] => 我是1, 从0seat位置吃3s
  operation: OptionalOperationList | null
  tingpais: Array<{
    tile: Tile
    zhenting: boolean
    infos: TingPaiInfo[]
  }>
}
export interface ActionDealTile {
  seat: number
  doras: Tile[]
  zhenting: boolean
  tile: Tile | '' // 如果是我的回合, 则存在，表示我的摸排
  operation: OptionalOperationList | null
  left_tile_count: number
  tingpais: Array<{
    tile: Tile
    zhenting: boolean
    infos: TingPaiInfo[]
  }>
}
export interface ActionDiscardTile {
  seat: number
  doras: Tile[]
  zhenting: boolean
  moqie: boolean
  operation: OptionalOperationList | null
  tile: Tile
  tingpais: TingPaiInfo[]
  is_liqi: boolean
  is_wliqi: boolean
}
export interface ActionHule {
  hules: HuleInfo[]
  old_scores: number[]
  delta_scores: number[]
  wait_timeout: number[]
  scores: number[]
  gameend: { scores: number[] }
  doras: Tile[]
}
export interface ActionLiuJu {
  type: number
  gameend: { scores: number[] }
  seat: number
  tiles: Tile[]
  liqi: LiQiSuccess
  allplayertiles: Tile[]
}
export interface ActionMJStart extends Record<string, any> {}
export interface ActionNoTile {
  liujumanguan: boolean
  players: Array<{
    tingpai: boolean
    hand: Tile[]
    tings: TingPaiInfo[]
  }>
  scores: Array<{
    seat: number
    old_scores: number[]
    delta_scores: number[]
    hand: Tile[]
    ming: Tile[]
    doras: Tile[]
    score: number
  }>
  gameend: boolean
}

export type ActionName = 'ActionAnGangAddGang' |
'ActionBaBei' |
'ActionChiPengGang' |
'ActionDealTile' |
'ActionDiscardTile' |
'ActionHule' |
'ActionLiuJu' |
'ActionMJStart' |
'ActionNewRound' |
'ActionNoTile'

export type Action = ActionAnGangAddGang |
ActionBaBei |
ActionChiPengGang |
ActionDealTile |
ActionDiscardTile |
ActionHule |
ActionLiuJu |
ActionMJStart |
ActionNewRound |
ActionNoTile

// === below: Msg JSON ====

export interface NotifyPlayerLoadGameReady {
  name: 'NotifyPlayerLoadGameReady'
  data: {
    ready_id_list: number[]
  }
}

export interface NotifyGameEndResult {
  name: 'NotifyGameEndResult'
  data: {
    result: Array<{
      seat: number
      total_point: number
      part_point_1: number
      part_point_2: number
      grading_score: number
      gold: number
    }>
  }
}

export interface NotifyGameTerminate {
  name: 'NotifyGameTerminate'
  data: {
    reason: string
  }
}

export interface ResSyncGame {
  name: 'ResSyncGame'
  data: {
    game_restore?: {
      actions: Array<{
        name: ActionName
        data: Action
        step: number
      }>
      game_state: number
      last_pause_time_ms: number
    }
    is_end: boolean
    step: number
  }
}

export interface ResAuthGame {
  name: 'ResAuthGame'
  data: {
    players: Array<{
      account_id: number
      avatar_id: number
      title: number
      nickname: string
      // ...
    }>
    seat_list: number[]
    is_game_start: boolean
    game_config: any
    ready_id_list: number[]
    error: Object | null
  }
}

export interface ResLogin {
  name: 'ResLogin'
  data: {
    account_id: number
    account: any /* ... */
    access_token: string
    // ...
  }
}

export interface ActionPrototype {
  name: 'ActionPrototype'
  data: {
    name: ActionName
    data: Action
    step: number
  }
}

export type ParsedMajsoulJSON = NotifyPlayerLoadGameReady |
NotifyGameEndResult |
NotifyGameTerminate |
ResSyncGame |
ResAuthGame |
ResLogin |
ActionPrototype
