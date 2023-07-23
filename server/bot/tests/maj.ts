import { bot } from '..'

// const wait = async (): Promise<void> => await new Promise(resolve => setTimeout(() => { resolve() }, 5000))

console.log('loading')
console.time('load OpenCV')
bot.init().then(async () => {
  console.timeEnd('load OpenCV')
  bot.updateCanvasWH(890, 500)
  bot.updateCanvasXY(550, 240)
  await bot.ensureClick('hu')
  // .then(wait)
  // .then(async () => await bot.ensureClickTile('1m'))
  // .then(wait)
  // .then(async () => await bot.ensureClickTile('3s'))
  // .then(wait)
  // .then(async () => await bot.ensureClickTile('1p'))
  // .then(wait)
  // .then(async () => await bot.ensureClickTile('9p'))
  // .then(wait)
  // .then(async () => await bot.ensureClickTile('3z'))
}).catch(console.log)
