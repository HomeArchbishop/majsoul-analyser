import type { TileHint } from '../utils/tileHints'

/** 柱槽固定高度；柱条只在槽内伸缩 */
const SCORE_MARK_SLOT_H_PX = 36

/**
 * 手牌上方：矩形高度 + 颜色表推荐强度，数字为 Q。
 * 外框高度固定，避免分析刷新时布局抖动。
 */
export function ScoreMark ({ hint }: { hint: TileHint }) {
  const { score, strength, rank } = hint
  const barH = Math.round(3 + strength * 16) // 3–19px，落在数字行之上
  const color = barColor(strength, rank === 0)

  return (
    <span
      className='flex w-5 shrink-0 flex-col items-center'
      style={{ height: SCORE_MARK_SLOT_H_PX }}
      title={`Q=${score.toFixed(2)}`}
    >
      <span className='flex min-h-0 w-full flex-1 items-end justify-center pb-0.5'>
        <span
          className='w-[0.35rem] rounded-[1px]'
          style={{ height: barH, backgroundColor: color }}
          aria-hidden
        />
      </span>
      <span
        className='flex h-3 shrink-0 items-center justify-center text-[0.5rem] tabular-nums leading-none tracking-tight'
        style={{ color }}
      >
        {score.toFixed(1)}
      </span>
    </span>
  )
}

export function ScoreMarkSlot () {
  return (
    <span
      className='w-5 shrink-0'
      style={{ height: SCORE_MARK_SLOT_H_PX }}
      aria-hidden
    />
  )
}

function barColor (strength: number, isBest: boolean): string {
  const t = Math.min(1, Math.max(0, strength))
  const r = Math.round(100 + t * (251 - 100))
  const g = Math.round(116 + t * (191 - 116))
  const b = Math.round(139 + t * (36 - 139))
  if (isBest) {
    return `rgb(${Math.min(255, r + 12)}, ${Math.min(255, g + 8)}, ${Math.max(0, b - 4)})`
  }
  return `rgb(${r}, ${g}, ${b})`
}
