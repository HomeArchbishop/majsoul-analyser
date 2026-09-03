/** MJAI 牌面（与 server/types/Mjai.ts 保持一致） */
export type Pai =
  | '1m' | '2m' | '3m' | '4m' | '5m' | '6m' | '7m' | '8m' | '9m'
  | '1p' | '2p' | '3p' | '4p' | '5p' | '6p' | '7p' | '8p' | '9p'
  | '1s' | '2s' | '3s' | '4s' | '5s' | '6s' | '7s' | '8s' | '9s'
  | '5mr' | '5pr' | '5sr'
  | 'E' | 'S' | 'W' | 'N'
  | 'P' | 'F' | 'C'
  | '?'

type Kaze = 'E' | 'S' | 'W' | 'N'

/** 牌桌方位（己方在 bottom） */
export type TableSide = 'bottom' | 'right' | 'top' | 'left'

export interface AnalysisSnapshot {
  candidates: Array<{
    action: unknown
    score?: number | null
  }>
  choice: unknown
  info: string
}

export interface MeldSnapshot {
  tiles: Pai[]
  calledIndex: number
  concealed: boolean
}

export interface PlayerSnapshot {
  seat: number
  tehai: Pai[]
  tsumoPai: Pai | null
  sutehai: Pai[]
  furo: MeldSnapshot[]
  ankan: MeldSnapshot[]
  reached: boolean
  reachHandLayIndex: number | null
  reachRiverIndex: number | null
  nuki: Pai[]
}

export interface RoundSnapshot {
  bakaze: Kaze
  kyoku: number
  honba: number
  kyotaku: number
  oya: number
  tilesLeft: number
  doraMarkers: Pai[]
  scores: number[]
  players: PlayerSnapshot[]
}

export interface BoardSnapshot {
  platformId?: string
  meSeat: number
  round: RoundSnapshot | null
}

export type UiMessage =
  | { type: 'log', args: unknown[] }
  | { type: 'board', snapshot: BoardSnapshot }
  | { type: 'analysis', snapshot: AnalysisSnapshot }

export interface UiState {
  board: BoardSnapshot | null
  analysis: AnalysisSnapshot | null
}
