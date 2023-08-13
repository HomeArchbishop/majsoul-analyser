import { Canvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { Mat, opencv } from '../bot/opencv'

export const debug = {
  saveScreenshot (cv: opencv.cv, searchMat: Mat) {
    const canvas = new Canvas(10000, 10000) as unknown as HTMLCanvasElement
    cv.imshow(canvas, searchMat)
    const dataBuffer = Buffer.from(canvas.toDataURL('image/png', 1).replace('data:image/png;base64,', ''), 'base64')
    fs.writeFileSync(path.resolve(__dirname, '../../image.png'), dataBuffer)
  }
}
