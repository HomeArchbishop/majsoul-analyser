import { majsoulPlatform } from './majsoul'
import { tenhouPlatform } from './tenhou'
import type { Platform, PlatformId } from './types'

const platforms: Record<PlatformId, Platform> = {
  majsoul: majsoulPlatform,
  tenhou: tenhouPlatform,
}

function getPlatform (id: PlatformId): Platform {
  return platforms[id]
}

export {
  getPlatform,
  platforms,
}

export type { Platform, PlatformId, PlatformSession, WireParseResult } from './types'
