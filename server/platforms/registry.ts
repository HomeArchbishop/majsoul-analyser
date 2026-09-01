export type { Platform, PlatformId, PlatformSession } from './types'

import { majsoulPlatform } from './majsoul'
import { tenhouPlatform } from './tenhou'
import type { Platform, PlatformId } from './types'

const platforms: Record<PlatformId, Platform> = {
  majsoul: majsoulPlatform,
  tenhou: tenhouPlatform,
}

export function getPlatform (id: PlatformId): Platform {
  return platforms[id]
}
