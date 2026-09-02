import { useEffect, useState } from 'react'

import type { AnalysisSnapshot, BoardSnapshot, UiMessage, UiState } from '../types'

function isDebugLayout (): boolean {
  return new URLSearchParams(window.location.search).get('debug') === 'layout'
}

export function useUiStream (): {
  board: BoardSnapshot | null
  analysis: AnalysisSnapshot | null
  connected: boolean
  debug: boolean
} {
  const debug = isDebugLayout()
  const [board, setBoard] = useState<BoardSnapshot | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisSnapshot | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (debug) {
      let cancelled = false
      import('../fixtures/debugBoard').then((m) => {
        if (cancelled) { return }
        setBoard(m.DEBUG_BOARD)
        setAnalysis(m.DEBUG_ANALYSIS)
        setConnected(true)
      })
      return () => { cancelled = true }
    }

    let source: EventSource | undefined

    const connect = () => {
      source = new EventSource('/ui/events')
      source.onopen = () => { setConnected(true) }
      source.onerror = () => {
        setConnected(false)
        source?.close()
        window.setTimeout(connect, 2000)
      }
      source.onmessage = (event) => {
        const message = JSON.parse(event.data) as UiMessage
        if (message.type === 'board') {
          setBoard(message.snapshot)
        }
        if (message.type === 'analysis') {
          setAnalysis(message.snapshot)
        }
      }
    }

    fetch('/ui/state')
      .then(res => res.json())
      .then((state: UiState) => {
        if (state.board !== null) { setBoard(state.board) }
        if (state.analysis !== null) { setAnalysis(state.analysis) }
      })
      .catch(() => {})

    connect()

    return () => {
      source?.close()
    }
  }, [debug])

  return { board, analysis, connected, debug }
}
