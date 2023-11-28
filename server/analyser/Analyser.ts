import { Analyser as A_mahjong_helper } from './analyser-mahjong_helper'

const reference = [
  A_mahjong_helper // 0
]

const analyser = {
  select (index: number) {
    return reference[index]
  }
}

export {
  analyser
}
