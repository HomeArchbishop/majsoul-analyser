import type { IncomingMessage } from 'node:http'

import cors from '@koa/cors'
import Koa from 'koa'
import Router from 'koa-router'

import { loadAnalyser } from './analyser/registry'
import logger from './logger'
import { Pipeline } from './pipeline/Pipeline'
import type { PlatformId } from './platforms/registry'
import UI from './UI'
import { createSerialExecutor } from './utils/createSerialExecutor'

const app = new Koa()
const router = new Router()

const pipeline = new Pipeline()
const runSerial = createSerialExecutor()

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

app
  .use(cors())
  .use(router.routes())
  .use(router.allowedMethods())

process.on('uncaughtException', function (err) {
  console.error(err)
  logger.error(`<server-base> Server service shutdown: ${err.message}`)
  process.exit(1)
})

UI.clear()
try {
  const analyserName = process.env.RUNTIME_CONF_ANALYSER
  if (analyserName === undefined || analyserName === '') {
    throw new Error('Missing RUNTIME_CONF_ANALYSER in .env')
  }
  UI.print(`Analyser module (${analyserName}) loading...`)
  pipeline.setAnalyser(await loadAnalyser(analyserName))
  app.listen(56556, () => {
    UI.clear()
    UI.print('All modules loaded. Service started at port: 56556')
    logger.info('<server-base> Server started at port 56556')
  })
} catch (err) {
  console.error(err)
  process.exit(1)
}
