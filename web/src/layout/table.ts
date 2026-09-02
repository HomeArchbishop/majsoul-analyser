import type { MeldSnapshot, Pai, TableSide } from '../types'

export const GAP = '0'
export const HALF_GAP = '0.625rem'
const RIVER_ROWS = 6

type FlexAxis = 'row' | 'col'
type CrossAlign = 'start' | 'end' | 'center'
type StackOrder = 'called-first' | 'stack-first'

const RIVER_BOX_H = 'h-[7.375rem] w-[8.125rem]'
const RIVER_BOX_V = 'h-[8.125rem] w-[7.375rem]'

/**
 * 四方几何（自家 bottom 为基准，top/right 镜像）。
 * DOM 手牌条恒为 [手牌, 副露]；barMirror 用 flex-*-reverse 把副露翻到朝中心。
 * 副露数据在 Seat 无脑 reverse，先副露贴手牌。
 */
interface SideLayout {
  barMirror: boolean
  vertical: boolean
  crossAlign: CrossAlign
  tileDeg: number
  outerCell: string
  kanStack: {
    axis: FlexAxis
    crossAlign: Extract<CrossAlign, 'center' | 'end'>
    order: StackOrder
  }
  river: {
    stack: FlexAxis
    stackMirror: boolean
    lineMirror: boolean
    slotBox: string
    slotAlign: string
  }
}

const SIDE: Record<TableSide, SideLayout> = {
  bottom: {
    barMirror: false,
    vertical: false,
    crossAlign: 'end',
    tileDeg: 0,
    outerCell: 'flex items-start justify-center',
    kanStack: { axis: 'col', crossAlign: 'center', order: 'stack-first' },
    river: {
      stack: 'col',
      stackMirror: false,
      lineMirror: false,
      slotBox: RIVER_BOX_H,
      slotAlign: 'items-start justify-center',
    },
  },
  top: {
    barMirror: true,
    vertical: false,
    crossAlign: 'start',
    tileDeg: 180,
    outerCell: 'flex items-end justify-center',
    kanStack: { axis: 'col', crossAlign: 'center', order: 'called-first' },
    river: {
      stack: 'col',
      stackMirror: true,
      lineMirror: true,
      slotBox: RIVER_BOX_H,
      slotAlign: 'items-end justify-center',
    },
  },
  left: {
    barMirror: false,
    vertical: true,
    crossAlign: 'start',
    tileDeg: 90,
    outerCell: 'flex items-center justify-end',
    kanStack: { axis: 'row', crossAlign: 'end', order: 'called-first' },
    river: {
      stack: 'row',
      stackMirror: true,
      lineMirror: false,
      slotBox: RIVER_BOX_V,
      slotAlign: 'items-center justify-end',
    },
  },
  right: {
    barMirror: true,
    vertical: true,
    crossAlign: 'end',
    tileDeg: -90,
    outerCell: 'flex items-center justify-start',
    kanStack: { axis: 'row', crossAlign: 'end', order: 'called-first' },
    river: {
      stack: 'row',
      stackMirror: false,
      lineMirror: true,
      slotBox: RIVER_BOX_V,
      slotAlign: 'items-center justify-start',
    },
  },
}

function crossItems (align: CrossAlign): string {
  switch (align) {
    case 'start': return 'items-start'
    case 'end': return 'items-end'
    case 'center': return 'items-center'
  }
}

export function flexDir (axis: FlexAxis, rev: boolean): string {
  if (axis === 'row') { return rev ? 'flex-row-reverse' : 'flex-row' }
  return rev ? 'flex-col-reverse' : 'flex-col'
}

function barAxis (side: TableSide): FlexAxis {
  return SIDE[side].vertical ? 'col' : 'row'
}

export function seatCell (side: TableSide): string {
  return SIDE[side].outerCell
}

export function seatTileDeg (side: TableSide): number {
  return SIDE[side].tileDeg
}

export function riverSlotClass (side: TableSide): string {
  const r = SIDE[side].river
  return `flex ${r.slotBox} shrink-0 ${r.slotAlign}`
}

export function riverPlaceholderClass (side: TableSide): string {
  return SIDE[side].river.slotBox
}

export function flexBoxClass (side: TableSide): string {
  const s = SIDE[side]
  return `flex shrink-0 ${crossItems(s.crossAlign)} ${flexDir(barAxis(side), s.barMirror)}`
}

export function handLayout (side: TableSide): {
  dir: FlexAxis
  rev: boolean
  tsumoInside: boolean
} {
  const s = SIDE[side]
  return {
    dir: barAxis(side),
    rev: s.barMirror,
    tsumoInside: !s.barMirror,
  }
}

export function tileCell (deg: number): string {
  const d = ((deg % 360) + 360) % 360
  return (d === 90 || d === 270) ? 'h-5 w-7' : 'h-7 w-5'
}

export function tileImgDeg (side: TableSide, lay: boolean): number {
  return SIDE[side].tileDeg + (lay ? -90 : 0)
}

export function riverLayout (side: TableSide): {
  stack: FlexAxis
  stackRev: boolean
  line: FlexAxis
  lineRev: boolean
} {
  const r = SIDE[side].river
  return {
    stack: r.stack,
    stackRev: r.stackMirror,
    line: barAxis(side),
    lineRev: r.lineMirror,
  }
}

export const CENTER_GRID =
  'grid-cols-[7.375rem_auto_7.375rem] grid-rows-[7.375rem_auto_7.375rem]'

export function riverChunks (tiles: Pai[]): Pai[][] {
  const out: Pai[][] = []
  for (let i = 0; i < tiles.length; i += RIVER_ROWS) {
    out.push(tiles.slice(i, i + RIVER_ROWS))
  }
  return out
}

/** 明杠叠牌子盒（加杠 / 大明杠） */
export function kanStackLayout (side: TableSide): {
  boxClass: string
  order: StackOrder
} {
  const k = SIDE[side].kanStack
  const dir = k.axis === 'col' ? 'flex-col' : 'flex-row'
  return {
    boxClass: `flex shrink-0 ${dir} ${crossItems(k.crossAlign)}`,
    order: k.order,
  }
}

/** 明杠叠牌：非暗、四张 → 末张叠在横置位上 */
export function meldStackPair (
  meld: Pick<MeldSnapshot, 'tiles' | 'calledIndex' | 'concealed'>,
): { base: number; stack: number } | null {
  if (meld.concealed || meld.tiles.length !== 4 || meld.calledIndex < 0) {
    return null
  }
  const stack = meld.tiles.length - 1
  if (stack === meld.calledIndex) { return null }
  return { base: meld.calledIndex, stack }
}

export function meldTileState (
  meld: MeldSnapshot,
  i: number,
): { lay: boolean; hidden: boolean; skip: boolean } {
  const pair = meldStackPair(meld)
  if (pair !== null && i === pair.stack) {
    return { lay: false, hidden: false, skip: true }
  }
  if (meld.concealed) {
    const hidden = meld.tiles.length === 4 ? (i === 0 || i === 3) : true
    return { lay: false, hidden, skip: false }
  }
  return {
    lay: i === meld.calledIndex,
    hidden: false,
    skip: false,
  }
}
