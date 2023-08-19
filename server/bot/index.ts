import { loadImage } from 'canvas'
import { getOpenCV, loadOpenCV, type opencv } from './opencv'
import path from 'path'
import { click, doubleClick, screenshot } from './robotjs'
import { Round } from '../gameRecords/Round'
import { Tile } from '../types/General'
import { sortTiles } from '../utils/sortTiles'
import logger from '../logger'
import UI from '../UI'

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

  updateDPI (dpi: number): void {
    this.dpi = dpi
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

  returnToHomePageWhenEnd (): void {
    this.#lastClickTask = this.#lastClickTask.then(async () => {
      await this.#useScale()
      logger.info('<bot> Start returning to homepage when end')
      let noConfirmCnt: number = 0
      let hasConfirmCnt: number = 0
      while (noConfirmCnt <= 5) {
        await new Promise<void>(resolve => setTimeout(() => { resolve() }, 8000))
        const shotX = this.canvasScreenX + this.canvasW * 0.8741
        const shotY = this.canvasScreenY + this.canvasH * 0.9083
        const shotW = this.canvasW * 0.0187
        const shotH = this.canvasH * 0.0077
        const screenshotBitmap = screenshot(shotX * this.dpi, shotY * this.dpi, shotW * this.dpi, shotH * this.dpi)
        let [b, g, r]: number[] = [screenshotBitmap.image[0], screenshotBitmap.image[1], screenshotBitmap.image[2]]
        for (let i = 4; i < (screenshotBitmap.width * screenshotBitmap.height) * 4; i += 4) {
          b = (b + Number(screenshotBitmap.image[i])) / 2
          g = (g + Number(screenshotBitmap.image[i + 1])) / 2
          r = (r + Number(screenshotBitmap.image[i + 2])) / 2
        }
        if (b < r || b < g) {
          noConfirmCnt++
          hasConfirmCnt = 0
          UI.print('No Comfirm', noConfirmCnt)
          logger.info('<bot> No comfirm button ' + String(noConfirmCnt))
          continue
        }
        const [clickX, clickY] = await this.#getClickPointByCV('confirm')
        noConfirmCnt = 0
        hasConfirmCnt++
        click(clickX, clickY)
        if (hasConfirmCnt >= 6) {
          click(0.898 * this.canvasW + this.canvasScreenX, 0.924 * this.canvasH + this.canvasScreenY)
          hasConfirmCnt = 0
        }
      }
      logger.info('<bot> Returned to homepage when end')
    })
  }

  startNewGameFromHomePage (): void {
    this.#lastClickTask = this.#lastClickTask.then(async () => {
      logger.info('<bot> Start new game from homepage')
      UI.print('Starting a new game')
      await this.#useScale()
      click(0.917 * this.canvasW + this.canvasScreenX, 0.171 * this.canvasH + this.canvasScreenY)
      await new Promise<void>(resolve => setTimeout(() => { resolve() }, 2000))
      click(0.723 * this.canvasW + this.canvasScreenX, 0.316 * this.canvasH + this.canvasScreenY)
      await new Promise<void>(resolve => setTimeout(() => { resolve() }, 2000))
      click(0.723 * this.canvasW + this.canvasScreenX, 0.384 * this.canvasH + this.canvasScreenY)
      await new Promise<void>(resolve => setTimeout(() => { resolve() }, 2000))
      click(0.723 * this.canvasW + this.canvasScreenX, 0.384 * this.canvasH + this.canvasScreenY)
      logger.info('<bot> Started new game from homepage')
    })
  }

  startNewGameFromEnd (): void {
    this.returnToHomePageWhenEnd()
    this.#lastClickTask = this.#lastClickTask.then(async () => await new Promise<void>(resolve => setTimeout(() => { resolve() }, 3000)))
    this.startNewGameFromHomePage()
  }

  ensureClick (tile: string, wait: boolean = false): void {
    this.#lastClickTask = this.#lastClickTask.then(async () => await this.clickTask(tile, wait).catch((err) => { logger.info(`<bot> err: ${err as string}`) }))
  }

  async clickTask (tile: string, wait: boolean = false): Promise<void> {
    if (this.cv === undefined) { return }
    await this.#useScale()

    await new Promise<void>(resolve => setTimeout(() => { resolve() }, 1500))

    if (wait) { await new Promise<void>(resolve => setTimeout(() => { resolve() }, 2000)) }

    const [clickX, clickY] = await this.#getClickPointByCalculation(tile)
    UI.print('click:', clickX, clickY)
    if (!/^\d(s|m|p|z)$/.test(tile)) {
      click(clickX, clickY)
    } else {
      doubleClick(clickX, clickY)
    }
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
      formatedTiles.push(...sortTiles(player.hand.slice(0, -1)))
      formatedTiles.push(player.hand.slice(-1)[0])
    } else {
      formatedTiles.push(...sortTiles(player.hand))
    }
    let index = formatedTiles.findIndex(t => t === tile)
    if (index === -1 && /5(s|m|p)/.test(tile)) { index = formatedTiles.findIndex(t => t === tile.replace(/5/g, '0')) }
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

    UI.print('shot:', shotX, shotY, shotW, shotH)
    await new Promise<void>(resolve => setTimeout(() => { resolve() }, 800))
    const screenshotBitmap = screenshot(shotX * this.dpi, shotY * this.dpi, shotW * this.dpi, shotH * this.dpi)
    for (let i = 0; i < (screenshotBitmap.width * screenshotBitmap.height) * 4; i += 4) {
      [screenshotBitmap.image[i], screenshotBitmap.image[i + 2]] = [screenshotBitmap.image[i + 2], screenshotBitmap.image[i]]
    }
    const screenshotImageData = new ImageData(new Uint8ClampedArray(screenshotBitmap.image as Buffer), screenshotBitmap.width, screenshotBitmap.height)
    const searchMat = this.cv.matFromImageData(screenshotImageData)
    const targetSearchMat = new this.cv.Mat()
    const targetSearchSize = new this.cv.Size(screenshotBitmap.width / this.dpi, screenshotBitmap.height / this.dpi)
    this.cv.resize(searchMat, targetSearchMat, targetSearchSize, 0, 0, this.cv.INTER_AREA)
    // const searchMat = this.cv.imread(await this.#loadTemplate('pengscreen.png'))

    const templateImage = await this.#loadTemplate(`${tile}.png`)
    const templateMat = this.cv.imread(templateImage)
    const targetTemplateMat = new this.cv.Mat()
    const targetTemplateSize = new this.cv.Size(templateImage.width * this.scale, templateImage.height * this.scale)
    this.cv.resize(templateMat, targetTemplateMat, targetTemplateSize, 0, 0, this.cv.INTER_AREA)

    const mtDst = new this.cv.Mat()
    const mtMask = new this.cv.Mat()

    this.cv.matchTemplate(targetSearchMat, targetTemplateMat, mtDst, this.cv.TM_CCOEFF, mtMask)
    const maxPoint = this.cv.minMaxLoc(mtDst, mtMask).maxLoc
    const maxVal = this.cv.minMaxLoc(mtDst, mtMask).maxVal

    UI.print('mt:', maxPoint, ':', maxVal)

    const clickX = maxPoint.x + targetTemplateSize.width / 2 + shotX
    const clickY = maxPoint.y + targetTemplateSize.height / 2 + shotY

    ;[mtDst, mtMask, searchMat, templateMat, targetTemplateMat, targetSearchMat].forEach(m => m.delete())

    return [clickX, clickY]
  }

  cv?: opencv.cv
  round: Round
  canvasW: number
  canvasH: number
  canvasScreenX: number
  canvasScreenY: number
  scale: number = 1 // 将模版放大的倍数

  dpi: number

  templateCaches: Record<string, HTMLImageElement> = {}

  #lastClickTask: Promise<void> = Promise.resolve()
}

export const bot = new Bot()
export { type Bot }
