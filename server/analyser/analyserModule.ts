import { detailizeParsedOperationList } from './detailizeParsedOperationList'
import { BaseAnalyser } from '../types/Analyser'
import fs from 'node:fs'
import path from 'node:path'

const analyserCollectionDir = __dirname
const reference = fs.readdirSync(analyserCollectionDir)
  .filter(n => /^analyser-/.test(n) && fs.lstatSync(path.resolve(analyserCollectionDir, n)).isDirectory())

const typedRequire = (analyserName: string): { default: BaseAnalyser } => require(`./${analyserName}`)

const analyserModule = {
  async load (analyserName: string): Promise<BaseAnalyser> {
    if (!reference.includes(analyserName)) {
      throw new RangeError(`Analyser module (${analyserName}) not found`)
    }
    const analyser = typedRequire(analyserName).default
    if (analyser.init !== undefined) {
      const inited = await analyser.init()
      if (!inited) {
        throw new Error(`Analyser module (${analyserName}) initialization failed`)
      }
    }
    return analyser
  },
  detailizeParsedOperationList
}

export {
  analyserModule
}
