import { readFileSync } from 'fs'
import path from 'path'

const baseURL = 'http://localhost:56556/'

const mock = readFileSync(path.resolve(__dirname, './mock.txt')).toString().split('\n')

let headPromise = Promise.resolve()
for (let i = 0; i < mock.length; i++) {
  if (/^\s*$/.test(mock[i])) { continue }
  headPromise = headPromise.then(async () => {
    await fetch(`${baseURL}?msg=${mock[i].slice(0, 3)}`, {
      method: 'POST',
      body: Buffer.from(JSON.parse(mock[i].slice(3))),
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
  }).catch((err) => console.error(err))
}
