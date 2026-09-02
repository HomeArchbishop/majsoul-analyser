import type { ServerResponse } from 'node:http'

import type { AnalysisSnapshot, BoardSnapshot, UiMessage, UISink } from './types'

type SseClient = {
  id: number
  res: ServerResponse
}

let nextClientId = 0
const clients = new Map<number, SseClient>()
let latestBoard: BoardSnapshot | null = null
let latestAnalysis: AnalysisSnapshot | null = null

function writeSse (res: ServerResponse, message: UiMessage): boolean {
  try {
    return res.write(`data: ${JSON.stringify(message)}\n\n`)
  } catch {
    return false
  }
}

function broadcast (message: UiMessage): void {
  for (const [id, client] of clients) {
    if (!writeSse(client.res, message)) {
      clients.delete(id)
    }
  }
}

export const webSink: UISink = {
  onMessage (message) {
    if (message.type === 'board') {
      latestBoard = message.snapshot
    }
    if (message.type === 'analysis') {
      latestAnalysis = message.snapshot
    }
    broadcast(message)
  },
}

export function getLatestBoard (): BoardSnapshot | null {
  return latestBoard
}

export function getLatestAnalysis (): AnalysisSnapshot | null {
  return latestAnalysis
}

export function addSseClient (res: ServerResponse): () => void {
  const id = nextClientId++
  clients.set(id, { id, res })

  if (latestBoard !== null) {
    writeSse(res, { type: 'board', snapshot: latestBoard })
  }
  if (latestAnalysis !== null) {
    writeSse(res, { type: 'analysis', snapshot: latestAnalysis })
  }

  return () => {
    clients.delete(id)
  }
}
