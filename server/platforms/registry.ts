export type { Platform, PlatformId, PlatformSession, WireParseResult } from './types'

import { majsoulPlatform } from './majsoul'
import { tenhouPlatform } from './tenhou'
import type { Platform, PlatformId } from './types'

export const platforms: Record<PlatformId, Platform> = {
  majsoul: majsoulPlatform,
  tenhou: tenhouPlatform,
}

export function getPlatform (id: PlatformId): Platform {
  return platforms[id]
}
