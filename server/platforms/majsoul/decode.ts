import { ParsedMajsoulJSON } from '../../types/ParsedMajsoulJSON'
import { getLiqiRoot, getWrapperType } from './liqiRoot'

const WIRE_KIND = { notify: 1, req: 2, res: 3 } as const

const ACTION_XOR_KEYS = [
  0x84, 0x5e, 0x4e, 0x42, 0x39, 0xa2, 0x1f, 0x60, 0x1c,
]

const SUPPORTED_RES_NAMES = new Set([
  'ResSyncGame',
  'ResAuthGame',
  'ResLogin',
])

interface WrapperPayload {
  data: Uint8Array
  name: string
}

function readRequestIndex (bytes: Uint8Array): number {
  return (bytes[2] << 8) + bytes[1]
}

function decryptActionPayload (payload: Uint8Array): Uint8Array {
  const decrypted = new Uint8Array(payload)
  for (let i = 0; i < decrypted.length; i++) {
    const xorMask = (23 ^ decrypted.length) + 5 * i + ACTION_XOR_KEYS[i % ACTION_XOR_KEYS.length] & 255
    decrypted[i] ^= xorMask
  }
  return decrypted
}

function decodeNotifyWire (bytes: Uint8Array): ParsedMajsoulJSON | null {
  const root = getLiqiRoot()
  const wrapper = getWrapperType()
  const { name, data } = wrapper.decode(bytes.slice(1)) as unknown as WrapperPayload

  const wireName = name.slice(4) as ParsedMajsoulJSON['name']
  let wireData: unknown
  try {
    wireData = root.lookupType(name).decode(data)
  } catch {
    return null
  }

  if (wireName === 'ActionPrototype') {
    const actionWire = wireData as { name: string, data: Uint8Array }
    const decrypted = decryptActionPayload(actionWire.data)
    ;(actionWire as { data: unknown }).data = root.lookupType(actionWire.name).decode(decrypted)
  }

  return { name: wireName, data: wireData } as ParsedMajsoulJSON
}

function decodeSyncGameActions (gameRestore: {
  actions: Array<{ name: string, data: Uint8Array | object }>
}): void {
  const root = getLiqiRoot()
  for (const action of gameRestore.actions) {
    action.data = root.lookupType(action.name).decode(action.data as Uint8Array)
  }
}

function decodeResWire (
  bytes: Uint8Array,
  resByIndex: Readonly<Record<number, { resName: string }>>,
): ParsedMajsoulJSON | null {
  const root = getLiqiRoot()
  const wrapper = getWrapperType()

  try {
    const index = readRequestIndex(bytes)
    const resName = resByIndex[index]?.resName
    if (resName === undefined || !SUPPORTED_RES_NAMES.has(resName)) {
      return null
    }

    const { data } = wrapper.decode(bytes.slice(3)) as unknown as WrapperPayload
    const wireData = root.lookupType('.lq.' + resName).decode(data) as unknown as Record<string, unknown>
    const gameRestore = wireData.game_restore as {
      actions: Array<{ name: string, data: Uint8Array | object }>
    } | undefined

    if (resName === 'ResSyncGame' && Array.isArray(gameRestore?.actions)) {
      decodeSyncGameActions(gameRestore)
    }

    return { name: resName as ParsedMajsoulJSON['name'], data: wireData } as ParsedMajsoulJSON
  } catch (err) {
    console.error(err)
    return null
  }
}

export function decodeMajsoulWire (
  binaryMsg: Buffer,
  resByIndex: Readonly<Record<number, { resName: string }>>,
): ParsedMajsoulJSON | null {
  const bytes = new Uint8Array(binaryMsg)
  const kind = bytes[0]

  if (kind === WIRE_KIND.notify) {
    return decodeNotifyWire(bytes)
  }
  if (kind === WIRE_KIND.res) {
    return decodeResWire(bytes, resByIndex)
  }
  return null
}
