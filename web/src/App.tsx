import { useState } from 'react'

import { AnalysisPanel } from './components/AnalysisPanel'
import { BoardView } from './components/BoardView'
import { CompactView } from './components/CompactView'
import { useKyokuStats } from './hooks/useKyokuStats'
import { useUiStream } from './hooks/useUiStream'

type ViewMode = 'full' | 'mini'

function readView (): ViewMode {
  return new URLSearchParams(window.location.search).get('view') === 'mini'
    ? 'mini'
    : 'full'
}

function writeView (mode: ViewMode): void {
  const url = new URL(window.location.href)
  if (mode === 'mini') {
    url.searchParams.set('view', 'mini')
  } else {
    url.searchParams.delete('view')
  }
  window.history.replaceState(null, '', url)
}

export default function App () {
  const { board, analysis, connected, debug } = useUiStream()
  const kyokuStats = useKyokuStats(board, analysis)
  const [view, setView] = useState<ViewMode>(readView)
  const snapshot = board ?? { meSeat: -1, round: null }

  const toggleView = () => {
    const next: ViewMode = view === 'mini' ? 'full' : 'mini'
    writeView(next)
    setView(next)
  }

  return (
    <div className="flex min-h-screen flex-col bg-table text-gray-300">
      <header className="flex shrink-0 items-center justify-between px-4 py-2 text-[0.7rem] text-gray-600">
        <span>majsoul-analyser</span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-300"
            onClick={toggleView}
          >
            {view === 'mini' ? '牌桌' : '小窗'}
          </button>
          {debug
            ? '布局调试'
            : <>
                {board?.platformId !== undefined && `${board.platformId} · `}
                {connected ? '已连接' : '重连中…'}
              </>}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {view === 'mini'
          ? <CompactView snapshot={snapshot} analysis={analysis} />
          : <BoardView snapshot={snapshot} analysis={analysis} />}
      </main>

      <AnalysisPanel analysis={analysis} kyokuStats={kyokuStats} />
    </div>
  )
}
