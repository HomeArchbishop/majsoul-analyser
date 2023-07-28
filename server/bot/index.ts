import { loadImage } from 'canvas'
import { getOpenCV, loadOpenCV, type opencv } from './opencv'
import path from 'path'
import { screenshot, tripleClick } from './robotjs'
import { Round } from '../gameRecords/Round'
import { Tile } from '../types/General'
import { sortTiles } from '../utils/sortTiles'

class Bot {
  async init (): Promise<boolean> {
    try {
      await loadOpenCV()
      this.cv = getOpenCV()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  updateCanvasWH (canvasW: number, canvasH: number): void {
    this.canvasW = canvasW
    this.canvasH = canvasH
  }

  updateCanvasXY (canvasScreenX: number, canvasScreenY: number): void {
    this.canvasScreenX = canvasScreenX
    this.canvasScreenY = canvasScreenY
  }

  updateRound (round: Round): void {
    this.round = round
  }

  async #loadTemplate (name: string): Promise<HTMLImageElement> {
    if (this.templateCaches[name] !== undefined) { return this.templateCaches[name] }
    const templateFile = path.resolve(__dirname, './templates', name)
    const img = await loadImage(templateFile) as unknown as HTMLImageElement
    this.templateCaches[name] = img
    return img
  }

  async #useScale (): Promise<void> {
    if (this.cv === undefined) { return }
    this.scale = this.canvasW / 1536 /* 1536 是手牌宽度 80 时的 canvas 宽度 */
  }

  async ensureClick (tile: string, wait: boolean = false): Promise<void> {
    if (this.cv === undefined) { return }
    await this.#useScale()

    if (wait) { await new Promise<void>(resolve => setTimeout(() => { resolve() }, 1300)) }

    const [clickX, clickY] = await this.#getClickPointByCalculation(tile)
    console.log('click:', clickX, clickY)
    tripleClick(clickX, clickY)
  }

  async #getClickPointByCalculation (tile: string): Promise<[number, number]> {
    if (!/^\d(s|m|p|z)$/.test(tile)) {
      return await this.#getClickPointByCV(tile)
    }
    const player = this.round.players[this.round.meSeat]
    if (player.hand === undefined) { return [NaN, NaN] }

    const formatedTiles: Tile[] = []
    const is14Tiles = player.hand.length + player.anGang.length * 3 + player.fulu.length * 3 === 14
    if (is14Tiles) {
      formatedTiles.push(...sortTiles(player.hand.slice(0, -1)).map(t => t.replace(/0/g, '5')) as Tile[])
      formatedTiles.push(player.hand.slice(-1)[0])
    } else {
      formatedTiles.push(...sortTiles(player.hand).map(t => t.replace(/0/g, '5')) as Tile[])
    }
    const index = formatedTiles.findIndex(t => t === tile)
    if (index === -1) { return await this.#getClickPointByCV(tile) }
    const clickX = (0.1168 + 0.0496 * (index + 0.5)) * this.canvasW + this.canvasScreenX + ((is14Tiles && index === player.hand.length - 1) ? 0.0168 : 0) * this.canvasW
    const clickY = 0.928 * this.canvasH + this.canvasScreenY
    return [clickX, clickY]
  }

  async #getClickPointByCV (tile: string): Promise<[number, number]> {
    if (this.cv === undefined) { return [NaN, NaN] }

    if (tile === 'tiaoguo') {
      await new Promise<void>(resolve => setTimeout(() => { resolve() }, 1000))
      return [1053 / 1536 * this.canvasW + this.canvasScreenX, 668 / 1536 * this.canvasW + this.canvasScreenY]
    }

    const shotX = this.canvasScreenX + this.canvasW * 0.091
    const shotY = this.canvasScreenY + this.canvasH * 0.58
    const shotW = this.canvasW * (1 - 0.091)
    const shotH = this.canvasH * 0.42

    console.log('shot:', shotX, shotY, shotW, shotH)
    await new Promise<void>(resolve => setTimeout(() => { resolve() }, 800))
    const screenshotBitmap = screenshot(shotX, shotY, shotW, shotH)
    const screenshotImageData = new ImageData(new Uint8ClampedArray(screenshotBitmap.image as Buffer), screenshotBitmap.width, screenshotBitmap.height)
    const searchMat = this.cv.matFromImageData(screenshotImageData)
    // const searchMat = this.cv.imread(await this.#loadTemplate('pengscreen.png'))

    const templateImage = await this.#loadTemplate(`${tile}.png`)
    const templateMat = this.cv.imread(templateImage)
    const targetTemplateMat = new this.cv.Mat()
    console.log(templateImage.width, templateImage.width * this.scale, templateImage.height * this.scale)
    const targetTemplateSize = new this.cv.Size(templateImage.width * this.scale, templateImage.height * this.scale)
    this.cv.resize(templateMat, targetTemplateMat, targetTemplateSize, 0, 0, this.cv.INTER_AREA)

    const mtDst = new this.cv.Mat()
    const mtMask = new this.cv.Mat()

    console.time('mt')
    this.cv.matchTemplate(searchMat, targetTemplateMat, mtDst, this.cv.TM_CCOEFF, mtMask)
    const maxPoint = this.cv.minMaxLoc(mtDst, mtMask).maxLoc
    const maxVal = this.cv.minMaxLoc(mtDst, mtMask).maxVal
    console.timeEnd('mt')

    console.log(maxPoint, ': ', maxVal)

    const clickX = maxPoint.x + targetTemplateSize.width / 2 + shotX
    const clickY = maxPoint.y + targetTemplateSize.height / 2 + shotY

    ;[mtDst, mtMask, searchMat, templateMat].forEach(m => m.delete())

    return [clickX, clickY]
  }

  cv?: opencv.cv
  round: Round
  canvasW: number
  canvasH: number
  canvasScreenX: number
  canvasScreenY: number
  scale: number = 1 // 将模版放大的倍数

  templateCaches: Record<string, HTMLImageElement> = {}
}

export const bot = new Bot()
export { type Bot }
