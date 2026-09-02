import type { Game } from '@/board/Game'
import type { Meld } from '@/board/Meld'
import type { PlatformId } from '@/platforms/registry'
import { cliSink } from '@/UI/cliSink'
import type { BoardSnapshot, MeldSnapshot, UiMessage } from '@/UI/types'
import { webSink } from '@/UI/webSink'

const sinks = [cliSink, webSink]

function publish (message: UiMessage): void {
  for (const sink of sinks) {
    sink.onMessage(message)
  }
}

function toMeldSnap (meld: Meld): MeldSnapshot {
  return {
    tiles: [...meld.tiles],
    calledIndex: meld.calledIndex,
    concealed: meld.concealed,
  }
}

/** 把 Game 拷成可 JSON 的快照；不做展示规则 */
function toBoardSnapshot (
  game: Game | undefined,
  platformId?: PlatformId,
): BoardSnapshot {
  if (game === undefined) {
    return { platformId, meSeat: -1, round: null }
  }

  const round = game.rounds[game.roundPointer]
  if (round === undefined) {
    return { platformId, meSeat: game.meSeat, round: null }
  }

  return {
    platformId,
    meSeat: game.meSeat,
    round: {
      bakaze: round.bakaze,
      kyoku: round.kyoku,
      honba: round.honba,
      kyotaku: round.kyotaku,
      oya: round.oya,
      tilesLeft: round.tilesLeft,
      doraMarkers: [...round.doraMarkers],
      scores: round.players.map((_, seat) => round.scores[seat] ?? 0),
      players: round.players.map((player, seat) => ({
        seat,
        tehai: [...player.tehai],
        tsumoPai: player.tsumoPai,
        sutehai: [...player.sutehai],
        furo: player.furo.map(toMeldSnap),
        ankan: player.ankan.map(toMeldSnap),
        reached: player.reached,
        reachHandLayIndex: player.reachHandLayIndex,
        reachRiverIndex: player.reachRiverIndex,
        nuki: [...player.nuki],
      })),
    },
  }
}

const UI = {
  print (...args: unknown[]): void {
    publish({ type: 'log', args })
  },

  clear (): void {
    console.clear()
  },

  publishBoard (game: Game | undefined, platformId?: PlatformId): void {
    publish({ type: 'board', snapshot: toBoardSnapshot(game, platformId) })
  },

  publishAnalysis (candidates: unknown[], choice: unknown, info: string): void {
    publish({ type: 'analysis', snapshot: { candidates, choice, info } })
  },
}

export default UI
