import { detailizeParsedOperationList } from './detailizeParsedOperationList'
import { BaseAnalyser } from '../types/Analyser'
import fs from 'node:fs'
import path from 'node:path'

const analyserCollectionDir = __dirname
const reference = fs.readdirSync(analyserCollectionDir)
  .filter(n => /^analyser-/.test(n) && fs.lstatSync(path.resolve(analyserCollectionDir, n)).isDirectory())

const analyserModule = {
  async load (analyserName: string): Promise<{ analyser: BaseAnalyser }> {
    if (!reference.includes(analyserName)) {
      throw new RangeError(`Analyser module (${analyserName}) not found`)
    }
    return require(`./${analyserName}`)
  },
  detailizeParsedOperationList
}

export {
  analyserModule
}
