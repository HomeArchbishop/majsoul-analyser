import type { BoardSnapshot, MeldSnapshot, Pai, PlayerSnapshot } from '../types'
import type { InferredAction } from './actionMatch'

function mePlayer (board: BoardSnapshot): PlayerSnapshot | null {
  if (board.round === null || board.meSeat < 0) { return null }
  return board.round.players.find(p => p.seat === board.meSeat) ?? null
}

function lastOf<T> (arr: T[]): T | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined
}

function meldKey (m: MeldSnapshot): string {
  return `${m.concealed ? 'c' : 'o'}:${m.tiles.join(',')}:${m.calledIndex}`
}

/** 从相邻两帧己方快照推断实际行动（无法判断则 null） */
export function inferMyAction (
  prev: BoardSnapshot,
  next: BoardSnapshot,
): InferredAction | null {
  const a = mePlayer(prev)
  const b = mePlayer(next)
  if (a === null || b === null) { return null }

  // 立直：先标 reached，切牌可能同帧或下一帧
  if (!a.reached && b.reached) {
    if (b.sutehai.length === a.sutehai.length + 1) {
      return { type: 'reach', pai: lastOf(b.sutehai) }
    }
    return { type: 'reach' }
  }
  if (a.reached && b.reached && a.reachRiverIndex === null && b.reachRiverIndex !== null) {
    // 立直后第一打（若上一帧只记了 reach）
    if (b.sutehai.length === a.sutehai.length + 1) {
      return { type: 'dahai', pai: lastOf(b.sutehai) as Pai }
    }
  }

  if (b.nuki.length === a.nuki.length + 1) {
    return { type: 'nuki' }
  }

  if (b.ankan.length === a.ankan.length + 1) {
    const meld = lastOf(b.ankan)!
    return { type: 'ankan', consumed: [...meld.tiles] }
  }

  // 加杠：副露数不变，某组 3→4
  if (b.furo.length === a.furo.length) {
    for (let i = 0; i < a.furo.length; i++) {
      const before = a.furo[i]
      const after = b.furo.find(m =>
        m.calledIndex === before.calledIndex &&
        m.concealed === before.concealed &&
        before.tiles.length === 3 &&
        m.tiles.length === 4 &&
        before.tiles.every((t, j) => t === m.tiles[j] || deakaLoose(t) === deakaLoose(m.tiles[j])),
      )
      if (after !== undefined) {
        return { type: 'kakan', pai: after.tiles[after.tiles.length - 1]! }
      }
    }
  }

  if (b.furo.length === a.furo.length + 1) {
    const meld = lastOf(b.furo)!
    const prevKeys = new Set(a.furo.map(meldKey))
    const added = b.furo.find(m => !prevKeys.has(meldKey(m))) ?? meld
    if (added.tiles.length === 4) {
      return {
        type: 'daiminkan',
        pai: added.tiles[added.calledIndex] ?? added.tiles[0]!,
        consumed: added.tiles.filter((_, i) => i !== added.calledIndex),
      }
    }
    // 吃/碰：叫牌在 calledIndex
    const pai = added.tiles[added.calledIndex]!
    const consumed = added.tiles.filter((_, i) => i !== added.calledIndex)
    const isChi = !consumed.every(t => deakaLoose(t) === deakaLoose(pai))
    if (isChi) {
      return { type: 'chi', pai, consumed }
    }
    return { type: 'pon', pai, consumed }
  }

  if (b.sutehai.length === a.sutehai.length + 1) {
    const pai = lastOf(b.sutehai)!
    const tsumogiri = a.tsumoPai !== null && deakaLoose(a.tsumoPai) === deakaLoose(pai)
    return { type: 'dahai', pai, tsumogiri }
  }

  // パス：己方无变化，他家有进展，且局未换
  if (
    sameKyoku(prev, next) &&
    a.tehai.length === b.tehai.length &&
    a.sutehai.length === b.sutehai.length &&
    a.furo.length === b.furo.length &&
    a.ankan.length === b.ankan.length &&
    a.nuki.length === b.nuki.length &&
    a.reached === b.reached &&
    boardProgressed(prev, next)
  ) {
    return { type: 'none' }
  }

  return null
}

function deakaLoose (pai: Pai): string {
  if (pai === '5mr') { return '5m' }
  if (pai === '5pr') { return '5p' }
  if (pai === '5sr') { return '5s' }
  return pai
}

export function kyokuKey (board: BoardSnapshot): string | null {
  const r = board.round
  if (r === null) { return null }
  return `${r.bakaze}-${r.kyoku}-${r.honba}-${r.oya}`
}

function sameKyoku (a: BoardSnapshot, b: BoardSnapshot): boolean {
  const ka = kyokuKey(a)
  const kb = kyokuKey(b)
  return ka !== null && ka === kb
}

function boardProgressed (prev: BoardSnapshot, next: BoardSnapshot): boolean {
  if (prev.round === null || next.round === null) { return false }
  if (prev.round.tilesLeft !== next.round.tilesLeft) { return true }
  for (let i = 0; i < next.round.players.length; i++) {
    const p = prev.round.players[i]
    const n = next.round.players[i]
    if (p === undefined || n === undefined) { continue }
    if (n.seat === next.meSeat) { continue }
    if (
      n.sutehai.length !== p.sutehai.length ||
      n.furo.length !== p.furo.length ||
      n.ankan.length !== p.ankan.length ||
      n.tehai.length !== p.tehai.length
    ) {
      return true
    }
  }
  return false
}
