import { randomBytes } from 'node:crypto'

export const nextTraceId = (() => {
  const bootId = randomBytes(2).toString('hex')
  let seq = 1
  /** Short boot id (4 hex) + seq; enough to tell restarts apart in logs. */
  return (): string => `${bootId}-${seq++}`
})()
