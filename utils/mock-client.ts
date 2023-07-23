import { readFileSync } from 'fs'
import { post } from 'request'
import path from 'path'

const baseURL = 'http://localhost:56556/'

const mock = readFileSync(path.resolve(__dirname, './mock.txt')).toString().split('\n')

let headPromise = Promise.resolve()
for (let i = 0; i < mock.length; i++) {
  if (/^\s*$/.test(mock[i])) { continue }
  headPromise = headPromise.then(async () => {
    let resolveFn
    const promise: Promise<void> = new Promise((resolve, reject) => { resolveFn = resolve })
    post({
      url: `${baseURL}?msg=${mock[i].slice(0, 3)}`,
      body: Buffer.from(JSON.parse(mock[i].slice(3)))
    }, () => { setTimeout(() => resolveFn(), 1000) })
    return await promise
  }).catch((err) => console.log(err))
}
