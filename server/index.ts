import Koa from 'koa'
import cors from '@koa/cors'
import Router from 'koa-router'
import { MsgHandler } from './msgHandler'
import env from './env'
import logger from './logger'
import { bot } from './bot'
import UI from './UI'

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
      const dpi = +(ctx.query.dpi ?? 1)
      if (msgType === 'res') {
        logger.info('<server-base> Server received res buffer: ' + JSON.stringify(buffer.toJSON().data))
        msgHandler.handleRes(buffer, ctx.query.meID as string | undefined, isWindowFocus ? { bot, canvasW, canvasH, canvasScreenX, canvasScreenY, dpi } : undefined)
      } else if (msgType === 'req') {
        logger.info('<server-base> Server received req buffer')
        msgHandler.handleReq(buffer)
      }
      ctx.status = 200
      resolve()
    })
  }))
  await next()
})

app
  .use(cors())
  .use(router.routes()).use(router.allowedMethods())

process.on('uncaughtException', function (err) {
  console.log(err)
  console.log(err.stack)
  logger.error(`<server-base> Server service shutdown: ${err.message}`)
  process.exit(1)
})

UI.print('OpenCV loading...')
bot.init()
  .then(inited => {
    if (!inited) { UI.print('OpenCV load failed...'); return }
    app.listen(56556, () => {
      UI.clear()
      UI.print('OpenCV loaded. Service started at port: 56556')
      logger.info('<server-base> Server started at port 56556')
    })
  })
  .catch((err) => console.error(err))
