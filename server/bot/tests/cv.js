const { getOpenCV, loadImage, loadOpenCV } = require('../opencv')
const path = require('path')

;(async () => {
  console.log('loading')
  console.time('loadedCV')
  await loadOpenCV()
  const cv = getOpenCV()
  console.timeEnd('loadedCV')
  const imageSearch = await loadImage(path.resolve(__dirname, '1.png'))
  const imageTemplate = await loadImage(path.resolve(__dirname, '3.png'))
  const search = cv.imread(imageSearch)
  const template = cv.imread(imageTemplate)

  const dst = new cv.Mat()
  const mask = new cv.Mat()
  console.time('mt')
  cv.matchTemplate(template, search, dst, cv.TM_CCOEFF, mask)
  const result = cv.minMaxLoc(dst, mask)
  const maxPoint = result.maxLoc
  console.timeEnd('mt')
  console.log(maxPoint)
})().catch(() => null)
