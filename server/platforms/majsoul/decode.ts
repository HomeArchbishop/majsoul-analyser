import { AnyNestedObject, Root } from 'protobufjs'

import { ParsedMajsoulJSON } from '../../types/ParsedMajsoulJSON'
import liqi from './liqi'

export function decodeMajsoulWire (
  binaryMsg: Buffer,
  resByIndex: Readonly<Record<number, { resName: string }>>,
): ParsedMajsoulJSON | null {
  const binaryMsgArr = new Uint8Array(binaryMsg)

  const msgType = { notify: 1, req: 2, res: 3 }
  const root = Root.fromJSON(liqi as AnyNestedObject)
  const wrapper = root.lookupType('Wrapper')
  interface DecodeMsg { data: Uint8Array, name: string }
  if (binaryMsgArr[0] === msgType.notify) {
    const { name, data } = wrapper.decode(binaryMsgArr.slice(1)) as unknown as DecodeMsg
    const parsedMajsoulJSON: any = { data: {}, name: name.slice(4) as ParsedMajsoulJSON['name'] }
    try {
      parsedMajsoulJSON.data = root.lookupType(name).decode(data)
    } catch (e) {
      return null
    }
    if (parsedMajsoulJSON.name === 'ActionPrototype') {
      const keys = [0x84, 0x5e, 0x4e, 0x42, 0x39, 0xa2, 0x1f, 0x60, 0x1c]
      for (let i = 0; i < parsedMajsoulJSON.data.data.length; i++) {
        const u = (23 ^ parsedMajsoulJSON.data.data.length) + 5 * i + keys[i % keys.length] & 255
        parsedMajsoulJSON.data.data[i] ^= u
      }
      parsedMajsoulJSON.data.data = root.lookupType(parsedMajsoulJSON.data.name).decode(parsedMajsoulJSON.data.data as Uint8Array)
    }
    return parsedMajsoulJSON
  }
  if (binaryMsgArr[0] === msgType.res) {
    try {
      const index = (binaryMsgArr[2] << 8) + binaryMsgArr[1]
      const resName = resByIndex[index]?.resName
      if (resName === undefined) { return null }
      const { data } = wrapper.decode(binaryMsgArr.slice(3)) as unknown as DecodeMsg
      const parsedMsg: any = { data: {}, name: resName as ParsedMajsoulJSON['name'] }
      parsedMsg.data = root.lookupType('.lq.' + resName).decode(data)
      switch (resName) {
        case 'ResSyncGame':
          if (Array.isArray(parsedMsg.data.game_restore?.actions)) {
            type SyncGameActionWire = { name: string, data: Uint8Array | object }
            ;(parsedMsg.data.game_restore.actions as SyncGameActionWire[]).forEach(
              ({ name: actionName, data }, index, list) => {
                list[index].data = root.lookupType(actionName).decode(data as Uint8Array)
              },
            )
          }
          break
        case 'ResAuthGame':
        case 'ResLogin':
          break
        default:
          return null
      }
      return parsedMsg
    } catch (e) {
      console.error(e)
      return null
    }
  }
  return null
}
