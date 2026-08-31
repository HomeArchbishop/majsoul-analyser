import fs from 'fs'
import path from 'path'

const envFile = path.resolve(__dirname, '../../.env')

function parseEnvFile (content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

function pathToEnvKey (dotPath: string): string {
  return dotPath.split('.').map((segment) =>
    segment.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
  ).join('_')
}

const env = {
  init (): void {
    if (!fs.existsSync(envFile)) {
      throw new Error('environment config file unexists. Please check `/.env`')
    }
    const parsed = parseEnvFile(fs.readFileSync(envFile, 'utf-8'))
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value
    }
  },
  get <T> (path: string): T {
    return process.env[pathToEnvKey(path)] as T
  },
}

export default env
