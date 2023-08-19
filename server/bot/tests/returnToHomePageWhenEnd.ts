import { bot } from '..'

// const wait = async (): Promise<void> => await new Promise(resolve => setTimeout(() => { resolve() }, 5000))

console.log('loading')
console.time('load OpenCV')
bot.init().then(async () => {
  console.timeEnd('load OpenCV')
  bot.updateCanvasWH(1024, 576)
  bot.updateCanvasXY(-6, 288)
  bot.updateDPI(1.5)
  bot.returnToHomePageWhenEnd()
}).catch(console.log)
