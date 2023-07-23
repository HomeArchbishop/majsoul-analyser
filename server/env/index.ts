import fs from 'fs'
import path from 'path'
import { type MAJ_ENV_JSON } from '../types/General'

const majENVJSONFile = path.resolve(__dirname, '../../.majenv.json')

const env = {
  init (): void {
    if (fs.existsSync(majENVJSONFile)) {
      const majENVJSON: MAJ_ENV_JSON = JSON.parse(fs.readFileSync(majENVJSONFile).toString())
      for (const key in majENVJSON) {
        process.env[key] = majENVJSON[key]
      }
    } else {
      fs.writeFileSync(majENVJSONFile, JSON.stringify({}))
    }
  },
  write (key: string, value: any): boolean {
    const majENVJSON: MAJ_ENV_JSON = JSON.parse(fs.readFileSync(majENVJSONFile).toString())
    majENVJSON[key] = value
    try {
      fs.writeFileSync(majENVJSONFile, JSON.stringify(majENVJSON))
      process.env[key] = value
      return true
    } catch {
      return false
    }
  },
  delete (key: string): boolean {
    return env.write(key, undefined)
  }
}

export default env
