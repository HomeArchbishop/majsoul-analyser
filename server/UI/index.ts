import { roundState } from './roundState'

const UI = {
  print (...msgs) {
    console.info(...msgs)
  },
  clear () {
    console.clear()
  },
  text: {
    roundState
  }
}

export default UI
