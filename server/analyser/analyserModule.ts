import { Analyser as A_mahjong_helper } from './analyser-mahjong_helper'
import { detailizeParsedOperationList } from './detailizeParsedOperationList'

const reference = [
  A_mahjong_helper // 0
]

const analyserModule = {
  select (index: number) {
    if (typeof index !== 'number') {
      throw new RangeError(`Analyser module index should be type number, but get ${typeof index}`)
    }
    if (index < 0 || index >= reference.length) {
      throw new RangeError(`Analyser module index should be in [0, ${reference.length - 1}], but get ${index}`)
    }
    return reference[index]
  },
  detailizeParsedOperationList
}

export {
  analyserModule
}
