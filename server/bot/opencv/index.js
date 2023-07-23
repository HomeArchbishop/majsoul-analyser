const { Canvas, Image, ImageData } = require('canvas')
const { JSDOM } = require('jsdom')

let cv

function loadOpenCV () {
  if (global.Module?.onRuntimeInitialized !== undefined && global.cv !== undefined) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    installDOM()
    global.Module = {
      onRuntimeInitialized () { resolve() }
    }
    cv = require('./opencv.js')
  })
}

function getOpenCV () {
  return cv
}

function installDOM () {
  const dom = new JSDOM()
  global.document = dom.window.document
  global.Image = Image
  global.HTMLCanvasElement = Canvas
  global.ImageData = ImageData
  global.HTMLImageElement = Image
}

module.exports = { loadOpenCV, getOpenCV }
