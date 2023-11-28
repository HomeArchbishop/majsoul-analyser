import fs from 'fs'
import path from 'path'
import { type MAJ_ENV_JSON } from '../types/General'

const majENVJSONFile = path.resolve(__dirname, '../../.majenv.json')

let envCaches = {}

const env = {
  init (): void {
    if (fs.existsSync(majENVJSONFile)) {
      const majENVJSON: MAJ_ENV_JSON = JSON.parse(fs.readFileSync(majENVJSONFile).toString())
      envCaches = majENVJSON
    } else {
      throw new Error('environment config file unexists. Please check `/.majenv.json`')
    }
  },
  reload (): void {
    env.init()
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
  get <T> (path: string): T {
    return path.split('.').reduce((p, c) => p[c], envCaches)
  },
  delete (key: string): boolean {
    return env.write(key, undefined)
  }
}

export default env
