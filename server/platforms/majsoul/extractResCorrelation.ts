import { getLiqiRoot, getWrapperType } from '@/platforms/majsoul/liqiRoot'

const TRACKED_REQUEST = /(authGame)|(syncGame)|(oauth2Login)|(login)|(emailLogin)/i

interface WrapperPayload {
  data: Uint8Array
  name: string
}

function readRequestIndex (bytes: Uint8Array): number {
  return (bytes[2] << 8) + bytes[1]
}

/** 解析 outbound 请求，记录 request index → 预期 inbound res 类型名。 */
export function extractResCorrelation (
  binaryReq: Buffer,
): Array<{ index: number, resName: string }> {
  const bytes = new Uint8Array(binaryReq)
  const wrapper = getWrapperType()

  try {
    const { name } = wrapper.decode(bytes.slice(3)) as unknown as WrapperPayload
    if (!TRACKED_REQUEST.test(name)) { return [] }

    const service = getLiqiRoot().lookup(name) as unknown as { responseType: string }
    return [{
      index: readRequestIndex(bytes),
      resName: service.responseType,
    }]
  } catch {
    return []
  }
}
