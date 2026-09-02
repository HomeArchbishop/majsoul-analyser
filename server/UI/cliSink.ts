import type { UISink } from './types'

export const cliSink: UISink = {
  onMessage (message) {
    if (message.type === 'log') {
      console.info(...message.args)
    }
  },
}
