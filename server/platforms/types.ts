import type { ActionCandidateList, MjaiEventList } from '../types/Mjai'

export type PlatformId = 'majsoul' | 'tenhou'

export interface WireParseResult {
  events: MjaiEventList
  candidates: ActionCandidateList
}

/**
 * Opaque handle for platform-private wire state.
 * Concrete fields live on each platform's own session type (e.g. MajsoulSession).
 * Pipeline must not read platform-specific fields from this.
 */

export interface PlatformSession {}

export type PlatformProcessResult = {
  result: WireParseResult
  session: PlatformSession
}

export interface Platform {
  createSession (): PlatformSession
  /** Client → server wire. May only update session (no MJAI). */
  onOutbound (buffer: Buffer, session: PlatformSession): PlatformProcessResult
  /** Server → client wire. Produces MJAI events / candidates. */
  onInbound (buffer: Buffer, session: PlatformSession): PlatformProcessResult
}
