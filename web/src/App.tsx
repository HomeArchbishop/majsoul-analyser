import { AnalysisPanel } from './components/AnalysisPanel'
import { BoardView } from './components/BoardView'
import { useKyokuStats } from './hooks/useKyokuStats'
import { useUiStream } from './hooks/useUiStream'

export default function App () {
  const { board, analysis, connected, debug } = useUiStream()
  const kyokuStats = useKyokuStats(board, analysis)

  return (
    <div className="flex min-h-screen flex-col bg-table text-gray-300">
      <header className="flex shrink-0 items-center justify-between px-4 py-2 text-[0.7rem] text-gray-600">
        <span>majsoul-analyser</span>
        <span>
          {debug
            ? '布局调试'
            : <>
                {board?.platformId !== undefined && `${board.platformId} · `}
                {connected ? '已连接' : '重连中…'}
              </>}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <BoardView
          snapshot={board ?? { meSeat: -1, round: null }}
          analysis={analysis}
        />
      </main>

      <AnalysisPanel analysis={analysis} kyokuStats={kyokuStats} />
    </div>
  )
}
