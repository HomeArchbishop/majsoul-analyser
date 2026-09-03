import type { PlatformId } from '@/platforms/registry'
import type { Kaze, Pai } from '@/types/Mjai'

export interface MeldSnapshot {
  tiles: Pai[]
  calledIndex: number
  concealed: boolean
}

interface PlayerSnapshot {
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

interface RoundSnapshot {
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
  platformId?: PlatformId
  meSeat: number
  round: RoundSnapshot | null
}

export interface AnalysisSnapshot {
  candidates: Array<{
    action: unknown
    score?: number | null
  }>
  choice: unknown
  info: string
}

export type UiMessage =
  | { type: 'log', args: unknown[] }
  | { type: 'board', snapshot: BoardSnapshot }
  | { type: 'analysis', snapshot: AnalysisSnapshot }

export interface UISink {
  onMessage (message: UiMessage): void
}
