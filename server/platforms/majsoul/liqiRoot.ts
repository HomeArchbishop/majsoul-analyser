import { AnyNestedObject, Root, Type } from 'protobufjs'

import liqi from '@/platforms/majsoul/liqi'

let root: Root | undefined

export function getLiqiRoot (): Root {
  if (root === undefined) {
    root = Root.fromJSON(liqi as AnyNestedObject)
  }
  return root
}

export function getWrapperType (): Type {
  return getLiqiRoot().lookupType('Wrapper')
}
