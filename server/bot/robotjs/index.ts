import robot from 'robotjs'

robot.setMouseDelay(50)

export function click (x: number, y: number): void {
  robot.moveMouseSmooth(x, y)
  robot.mouseClick()
  robot.moveMouseSmooth(x, Math.max(y - 300, 10))
}

export function doubleClick (x: number, y: number): void {
  robot.moveMouseSmooth(x, y, 0.05)
  robot.mouseClick('left', true)
  robot.moveMouseSmooth(x, Math.max(y - 300, 10))
}

export function tripleClick (x: number, y: number): void {
  robot.moveMouseSmooth(x, y, 0.05)
  robot.mouseClick()
  robot.mouseClick('left', true)
  robot.moveMouseSmooth(x, Math.max(y - 300, 10))
}

export function screenshot (x?: number, y?: number, width?: number, height?: number): robot.Bitmap {
  return robot.screen.capture(x, y, width, height)
}
