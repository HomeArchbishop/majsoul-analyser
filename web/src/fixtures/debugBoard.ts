import type { AnalysisSnapshot, BoardSnapshot, MeldSnapshot, PlayerSnapshot } from '../types'

/** 布局调试：?debug=layout */

const DEBUG_FURO: MeldSnapshot[] = [
  { tiles: ['1s', '2s', '5sr'], calledIndex: 0, concealed: false },
  // 大明杠（前端由 4 张明副露推导叠牌）
  { tiles: ['W', 'W', 'W', 'W'], calledIndex: 2, concealed: false },
  // 加杠
  { tiles: ['S', 'S', 'S', 'S'], calledIndex: 1, concealed: false },
]

const DEBUG_ANKAN: MeldSnapshot[] = [
  { tiles: ['E', 'E', 'E', 'E'], calledIndex: -1, concealed: true },
]

const SAMPLE_HAND = ['1m', '2m'] as const

function debugPlayer (seat: number, isMe: boolean): PlayerSnapshot {
  const tsumo = isMe ? '5p' : '?'
  return {
    seat,
    tehai: isMe ? [...SAMPLE_HAND, tsumo] : ['?', '?', tsumo],
    tsumoPai: tsumo,
    sutehai: ['7m', '8m', '9m', '1p', '2p', '3p', '4p', '5pr'],
    furo: DEBUG_FURO.map(m => ({ ...m, tiles: [...m.tiles] })),
    ankan: DEBUG_ANKAN.map(m => ({ ...m, tiles: [...m.tiles] })),
    reached: false,
    reachHandLayIndex: null,
    reachRiverIndex: null,
    nuki: [],
  }
}

export const DEBUG_BOARD: BoardSnapshot = {
  platformId: 'majsoul',
  meSeat: 0,
  round: {
    bakaze: 'E',
    kyoku: 2,
    honba: 0,
    kyotaku: 0,
    oya: 0,
    tilesLeft: 38,
    doraMarkers: ['5s', '6m'],
    scores: [25000, 25000, 25000, 25000],
    players: [0, 1, 2, 3].map(seat => debugPlayer(seat, seat === 0)),
  },
}

export const DEBUG_ANALYSIS: AnalysisSnapshot = {
  candidates: [
    { action: { type: 'dahai', pai: '5p', tsumogiri: true }, score: 1.24 },
    { action: { type: 'dahai', pai: '1m', tsumogiri: false }, score: 0.81 },
    { action: { type: 'dahai', pai: '2m', tsumogiri: false }, score: -0.12 },
    { action: { type: 'chi', pai: '3s', consumed: ['1s', '2s'] }, score: 0.4 },
    { action: { type: 'pon', pai: '5pr', consumed: ['5p', '5p'] }, score: -0.2 },
    { action: { type: 'reach', pai: '1m' }, score: 0.9 },
    { action: { type: 'hora', pai: '3s', target: 2 }, score: 2.1 },
    { action: { type: 'none' }, score: -0.55 },
  ],
  choice: { type: 'hora', pai: '3s', target: 2 },
  info: 'layout debug',
}
