import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type Koa from 'koa'
import Router from 'koa-router'
import serve from 'koa-static'

import { addSseClient, getLatestAnalysis, getLatestBoard } from '@/UI/webSink'

const webDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../web/dist',
)

export function attachWebUi (app: Koa): void {
  const router = new Router()

  router.get('/ui/events', async (ctx) => {
    ctx.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    ctx.status = 200
    ctx.respond = false

    const res = ctx.res
    res.write(': connected\n\n')

    const remove = addSseClient(res)
    res.on('close', remove)
  })

  router.get('/ui/state', (ctx) => {
    ctx.body = {
      board: getLatestBoard(),
      analysis: getLatestAnalysis(),
    }
  })

  app.use(router.routes())
  app.use(router.allowedMethods())

  if (!fs.existsSync(webDist)) { return }

  app.use(serve(webDist))
  app.use(async (ctx, next) => {
    await next()
    if (ctx.method !== 'GET' || ctx.path.startsWith('/ui')) { return }
    if (ctx.status !== 404 && ctx.body !== null) { return }
    ctx.status = 200
    ctx.type = 'html'
    ctx.body = fs.createReadStream(path.join(webDist, 'index.html'))
  })
}
