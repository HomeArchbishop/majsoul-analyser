import Koa from 'koa'
import cors from '@koa/cors'
import Router from 'koa-router'
import { MsgHandler } from './msgHandler'
import env from './env'
import logger from './logger'
import { bot } from './bot'
import UI from './UI'
import type { GameNameString } from './types/General'
import { analyserModule } from './analyser/analyserModule'

env.init()

const app = new Koa()
const router = new Router()

const msgHandler = new MsgHandler()

const msgQueue = {
  cur: Promise.resolve(),
  async add (promise: Promise<void>) {
    msgQueue.cur = msgQueue.cur.then(async () => await promise)
    await msgQueue.cur
  }
}

router.post('/', async function (ctx, next) {
  const params: Buffer[] = []
  await msgQueue.add(new Promise<void>((resolve, reject) => {
    ctx.req.on('data', (chunk: Buffer) => {
      params.push(chunk)
    })
    ctx.req.on('end', () => {
      const buffer = Buffer.concat(params)
      const msgType = ctx.query.msg as 'req' | 'res'
      const canvasW = +(ctx.query.w ?? 0)
      const canvasH = +(ctx.query.h ?? 0)
      const canvasScreenX = +(ctx.query.x ?? 0)
      const canvasScreenY = +(ctx.query.y ?? 0)
      const isWindowFocus = ctx.query.f === 'true'
      const autoGame = ctx.query.ag === 'true'
      const dpi = +(ctx.query.dpi ?? 1)
      const jian = +(ctx.query.jian ?? 0)
      const chang = +(ctx.query.chang ?? 0)
      const gameName = String(ctx.query.game) as GameNameString
      let handleFuncPromise: Promise<void> = Promise.resolve()
      if (msgType === 'res') {
        logger.info('<server-base> Server received res buffer: ' + JSON.stringify(buffer.toJSON().data))
        handleFuncPromise = msgHandler.handleRes(buffer, ctx.query.meID as string | undefined, gameName, isWindowFocus ? { bot, canvasW, canvasH, canvasScreenX, canvasScreenY, dpi, autoGame, jian, chang } : undefined)
      } else if (msgType === 'req') {
        logger.info('<server-base> Server received req buffer')
        handleFuncPromise = msgHandler.handleReq(buffer, gameName)
      }
      handleFuncPromise.then(() => {
        ctx.status = 200
        resolve()
      }).catch(() => null)
    })
  }))
  await next()
})

app
  .use(cors())
  .use(router.routes()).use(router.allowedMethods())

process.on('uncaughtException', function (err) {
  console.error(err)
  logger.error(`<server-base> Server service shutdown: ${err.message}`)
  process.exit(1)
})

UI.print('OpenCV loading...')
;(async () => {
  try {
    const isBotInited = await bot.init()
    if (!isBotInited) { UI.print('OpenCV load failed...'); return }
    msgHandler.setAnalyser(await analyserModule.load(env.get<string>('runtimeConf.analyser')))
    if (!isBotInited) { UI.print('OpenCV load failed...'); return }
    app.listen(56556, () => {
      UI.clear()
      UI.print('OpenCV loaded. Service started at port: 56556')
      logger.info('<server-base> Server started at port 56556')
    })
  } catch (err) {
    console.error(err)
  }
})().catch(() => null)
