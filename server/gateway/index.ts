import type { IncomingMessage } from 'node:http'

import cors from '@koa/cors'
import Koa from 'koa'
import Router from 'koa-router'

import logger from '@/logger'
import type { Pipeline } from '@/pipeline/Pipeline'
import type { PlatformId } from '@/platforms/registry'
import { attachWebUi } from '@/UI/webServer'
import { createSerialExecutor } from '@/utils/createSerialExecutor'

async function readRequestBody (req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/**
 * HTTP query `msg=req|res` is transport direction from the userscript:
 * - req  → client → server (outbound)
 * - res  → server → client (inbound)
 * Also accepts `direction=out|in` as an alias.
 */
function resolveWireDirection (query: Record<string, string | string[] | undefined>): 'outbound' | 'inbound' | undefined {
  const msg = String(query.msg ?? '')
  const direction = String(query.direction ?? '')
  if (msg === 'req' || direction === 'out' || direction === 'outbound') { return 'outbound' }
  if (msg === 'res' || direction === 'in' || direction === 'inbound') { return 'inbound' }
  return undefined
}

function createIngestRouter (pipeline: Pipeline): Router {
  const router = new Router()
  const runSerial = createSerialExecutor()

  router.post('/', async function (ctx) {
    const buffer = await readRequestBody(ctx.req)
    const platformId = String(ctx.query.game) as PlatformId
    const wireDirection = resolveWireDirection(ctx.query as Record<string, string | string[] | undefined>)

    await runSerial(async () => {
      if (wireDirection === 'inbound') {
        logger.info('<server-base> Server received inbound buffer: ' + JSON.stringify(buffer.toJSON().data))
        await pipeline.handleInbound(buffer, platformId)
      } else if (wireDirection === 'outbound') {
        logger.info('<server-base> Server received outbound buffer')
        await pipeline.handleOutbound(buffer, platformId)
      }
    })

    ctx.status = 200
  })

  return router
}

/** 组装 Koa app：全局中间件 → 业务路由 → webui */
export function createGateway (pipeline: Pipeline): Koa {
  const app = new Koa()
  const ingest = createIngestRouter(pipeline)

  // 全局中间件（按需往这里加）
  app.use(cors())

  // 用户脚本 ingest
  app.use(ingest.routes())
  app.use(ingest.allowedMethods())

  // webui / SSE
  attachWebUi(app)

  return app
}
