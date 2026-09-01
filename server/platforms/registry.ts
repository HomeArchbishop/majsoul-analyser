export type { Platform, PlatformId, PlatformSession } from '@/platforms/types'

import { majsoulPlatform } from '@/platforms/majsoul'
import { tenhouPlatform } from '@/platforms/tenhou'
import type { Platform, PlatformId } from '@/platforms/types'

const platforms: Record<PlatformId, Platform> = {
  majsoul: majsoulPlatform,
  tenhou: tenhouPlatform,
}

export function getPlatform (id: PlatformId): Platform {
  return platforms[id]
}
