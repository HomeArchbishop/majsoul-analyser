import cors from '@koa/cors'
import Koa from 'koa'
import Router from 'koa-router'

import { loadAnalyser } from './analyser/registry'
import env from './env'
import logger from './logger'
import { Pipeline } from './pipeline/Pipeline'
import type { GameNameString } from './types/General'
import UI from './UI'

env.init()

const app = new Koa()
const router = new Router()

const pipeline = new Pipeline()

const msgQueue = {
  cur: Promise.resolve(),
  async add (promise: Promise<void>) {
    msgQueue.cur = msgQueue.cur.then(async () => await promise)
    await msgQueue.cur
  },
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
      const gameName = String(ctx.query.game) as GameNameString
      let handleFuncPromise: Promise<void> = Promise.resolve()
      if (msgType === 'res') {
        logger.info('<server-base> Server received res buffer: ' + JSON.stringify(buffer.toJSON().data))
        handleFuncPromise = pipeline.handleRes(buffer, ctx.query.meID as string | undefined, gameName).then(() => {
          if (pipeline.meID !== undefined) {
            ctx.set('X-Majsoul-Account-Id', pipeline.meID)
          }
        })
      } else if (msgType === 'req') {
        logger.info('<server-base> Server received req buffer')
        handleFuncPromise = pipeline.handleReq(buffer, gameName)
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
  .use(cors({ exposeHeaders: ['X-Majsoul-Account-Id'] }))
  .use(router.routes()).use(router.allowedMethods())

process.on('uncaughtException', function (err) {
  console.error(err)
  logger.error(`<server-base> Server service shutdown: ${err.message}`)
  process.exit(1)
})

UI.clear()
;(async () => {
  try {
    const analyserName = env.get<string>('runtimeConf.analyser')
    UI.print(`Analyser module (${analyserName}) loading...`)
    pipeline.setAnalyser(await loadAnalyser(analyserName))
    app.listen(56556, () => {
      UI.clear()
      UI.print('All modules loaded. Service started at port: 56556')
      logger.info('<server-base> Server started at port 56556')
    })
  } catch (err) {
    console.error(err)
  }
})().catch(() => null)
