import { loadAnalyser } from '@/analyser/registry'
import { createGateway } from '@/gateway'
import logger from '@/logger'
import { Pipeline } from '@/pipeline/Pipeline'
import UI from '@/UI'

const pipeline = new Pipeline()
const app = createGateway(pipeline)

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
  const port = parseInt(process.env.PORT ?? '56556', 10)
  app.listen(port, () => {
    UI.clear()
    UI.print(`All modules loaded. Service started at port: ${port}`)
    UI.print(`Web UI: http://localhost:${port}/ (build with \`bun run build:web\` first)`)
    logger.info(`<server-base> Server started at port ${port}`)
  })
} catch (err) {
  console.error(err)
  process.exit(1)
}
