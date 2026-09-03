import type { CallLabel } from '../utils/callLabels'

/** 手牌盒右上外侧：鸣牌 / 立直 / 和了等日语选项 */
export function CallLabels ({ labels }: { labels: CallLabel[] }) {
  if (labels.length === 0) { return null }

  return (
    <div
      className='pointer-events-none absolute bottom-full left-full z-10 mb-0.5 ml-1 flex flex-col items-start gap-0.5'
      aria-label='操作候補'
    >
      {labels.map(label => (
        <span
          key={label.key}
          className={
            label.recommended
              ? 'whitespace-nowrap text-[0.65rem] font-medium leading-tight text-amber-200'
              : 'whitespace-nowrap text-[0.65rem] leading-tight text-gray-500'
          }
        >
          {label.text}
          {label.score != null && (
            <span className='ml-1 tabular-nums opacity-70'>
              {label.score.toFixed(1)}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
