import { AnyNestedObject, Root } from 'protobufjs'

import liqi from './liqi'

/** Decode outbound Majsoul wire and return res-name correlations by request index. */
function extractResCorrelation (binaryReq: Buffer): Array<{ index: number, resName: string }> {
  const binaryReqArr = new Uint8Array(binaryReq)

  const root = Root.fromJSON(liqi as AnyNestedObject)
  const wrapper = root.lookupType('Wrapper')

  try {
    interface DecodeReq { data: Uint8Array, name: string }

    const { name } = wrapper.decode(binaryReqArr.slice(3)) as unknown as DecodeReq

    const service = root.lookup(name) as unknown as { responseType: string }
    const resName = service.responseType

    if (
      /(authGame)|(syncGame)|(oauth2Login)|(login)|(emailLogin)/i.test(name)
    ) {
      return [{
        resName, index: (binaryReqArr[2] << 8) + binaryReqArr[1],
      }]
    } else {
      return []
    }
  } catch {
    return []
  }
}

export { extractResCorrelation }
