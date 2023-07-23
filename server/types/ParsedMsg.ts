import { ActionName, Action } from './Action'

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

export type ParsedMsg = NotifyPlayerLoadGameReady |
NotifyGameEndResult |
NotifyGameTerminate |
ResSyncGame |
ResAuthGame |
ResLogin |
ActionPrototype
