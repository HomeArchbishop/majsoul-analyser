import { Root, AnyNestedObject } from 'protobufjs'
import liqi from './liqi'
import { ParsedMsg } from '../types/ParsedMsg'

function parseResBufferMsg (binaryMsg: Buffer, reqQueue: Readonly<Record<number, { resName: string }>>): ParsedMsg | null {
  const binaryMsgArr = new Uint8Array(binaryMsg)

  const msgType = { notify: 1, req: 2, res: 3 }
  const root = Root.fromJSON(liqi as AnyNestedObject)
  const wrapper = root.lookupType('Wrapper')
  interface DecodeMsg { data: Uint8Array, name: string }
  if (binaryMsgArr[0] === msgType.notify) {
    const { name, data } = wrapper.decode(binaryMsgArr.slice(1)) as unknown as DecodeMsg
    const parsedMsg: any = { data: {}, name: name.slice(4) as ParsedMsg['name'] }
    try {
      parsedMsg.data = root.lookupType(name).decode(data)
    } catch (e) {
      return null
    }
    if (parsedMsg.name === 'ActionPrototype') {
      // 2023年初，雀魂在 protobuf 的 ActionPrototype 中加入了下方的混淆
      const keys = [0x84, 0x5e, 0x4e, 0x42, 0x39, 0xa2, 0x1f, 0x60, 0x1c]
      for (let i = 0; i < parsedMsg.data.data.length; i++) {
        const u = (23 ^ parsedMsg.data.data.length) + 5 * i + keys[i % keys.length] & 255
        parsedMsg.data.data[i] ^= u
      }
      // if this err happens, it will kill the whole process. I did it intendly
      parsedMsg.data.data = root.lookupType(parsedMsg.data.name).decode(parsedMsg.data.data as Uint8Array)
    }
    return parsedMsg
  }
  if (binaryMsgArr[0] === msgType.res) {
    try {
      const index = (binaryMsgArr[2] << 8) + binaryMsgArr[1]
      const resName = reqQueue[index]?.resName
      if (resName === undefined) { return null }
      const { data } = wrapper.decode(binaryMsgArr.slice(3)) as unknown as DecodeMsg
      const parsedMsg: any = { data: {}, name: resName as ParsedMsg['name'] }
      // => resName === eg. 'ResSyncGame'
      parsedMsg.data = root.lookupType('.lq.' + resName).decode(data)
      switch (resName) {
        case 'ResSyncGame':
          if (Array.isArray(parsedMsg.data.game_restore?.actions)) {
            (parsedMsg.data.game_restore.actions).forEach(({ name: actionName, data }, index, list) => {
              list[index].data = root.lookupType(actionName as string).decode(data as Uint8Array)
            })
          }
          break
        case 'ResAuthGame':
          break
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

export { parseResBufferMsg }
