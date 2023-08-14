import { readFileSync } from 'fs'
import { post } from 'request'
import path from 'path'

const baseURL = 'http://localhost:56556/'

const mock = readFileSync(path.resolve(__dirname, './log-sample.log')).toString()
  .split('\n')
  .map(l => {
    if (l.includes('server-base') && l.includes('req buffer')) {
      const binary = l.match(/\[.*?\]/)
      if (binary !== null) {
        return { type: 'req', binary: binary[0] }
      }
    }
    if (l.includes('server-base') && l.includes('res buffer')) {
      const binary = l.match(/\[.*?\]/)
      if (binary !== null) {
        return { type: 'res', binary: binary[0] }
      }
    }
    return undefined
  })
  .filter(i => i !== undefined)

let headPromise = Promise.resolve()
for (let i = 0; i < mock.length; i++) {
  const item = mock[i]
  if (item === undefined) { continue }
  headPromise = headPromise.then(async () => {
    let resolveFn
    const promise: Promise<void> = new Promise((resolve, reject) => { resolveFn = resolve })
    post({
      url: `${baseURL}?msg=${item.type}`,
      body: Buffer.from(JSON.parse(item.binary))
    }, (err, resp) => { if (err !== null) { console.error(err) }; console.log(resp.statusCode); setTimeout(() => resolveFn(), 10) })
    console.log(Buffer.from(JSON.parse(item.binary)).toJSON().data)
    return await promise
  }).catch((err) => console.log(err))
}
