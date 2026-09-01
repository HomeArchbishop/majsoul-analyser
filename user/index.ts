import { wsHook } from './wshook'

const serverURL = 'http://localhost:56556/'

let cachedAccountId = ''

function digAccountId (value: unknown, depth = 0): string {
  if (value === null || value === undefined || depth > 5) { return '' }
  if (typeof value === 'number' || typeof value === 'string') {
    const s = String(value)
    return /^\d{5,}$/.test(s) ? s : ''
  }
  if (typeof value !== 'object') { return '' }
  const obj = value as Record<string, unknown>
  for (const key of ['account_id', 'accountId', 'uid', 'user_id', 'userId']) {
    if (key in obj) {
      const found = digAccountId(obj[key], depth + 1)
      if (found.length > 0) { return found }
    }
  }
  if ('account' in obj) {
    const found = digAccountId(obj.account, depth + 1)
    if (found.length > 0) { return found }
  }
  return ''
}

function readAccountIdFromStorage (): string {
  for (const key of Object.keys(localStorage)) {
    const value = localStorage.getItem(key)
    if (value === null) { continue }
    try {
      const found = digAccountId(JSON.parse(value))
      if (found.length > 0) { return found }
    } catch {
      continue
    }
  }
  return ''
}

function resolveAccountId (): string {
  if (cachedAccountId.length > 0) { return cachedAccountId }

  const candidates: unknown[] = [
    (window as any)?.GameMgr?.Inst?.account_data?.account_id,
    (window as any)?.GameMgr?.Inst?.account_id,
    (window as any)?.uiscript?.UI_Lobby?.Inst?.account_data?.account_id,
  ]
  for (const c of candidates) {
    const found = digAccountId(c)
    if (found.length > 0) {
      cachedAccountId = found
      return cachedAccountId
    }
  }

  const storageAccountId = readAccountIdFromStorage()
  if (storageAccountId.length > 0) {
    cachedAccountId = storageAccountId
    return cachedAccountId
  }

  return ''
}

function rememberAccountIdFromResponse (req: XMLHttpRequest): void {
  const accountId = req.getResponseHeader('X-Majsoul-Account-Id')
  if (accountId !== null && accountId.length > 0) {
    cachedAccountId = accountId
  }
}

function sendToServer (req: XMLHttpRequest, query: string, body: ArrayBuffer | Document | Blob | BufferSource | FormData | URLSearchParams | string | null): void {
  req.open('POST', `${serverURL}?${query}`)
  req.onload = () => { rememberAccountIdFromResponse(req) }
  req.send(body)
}

function isMajsoulGateway (url: string): boolean {
  return url.includes('/game-gateway') || url.includes('/ws-gateway')
}

if (window.location.host === 'game.maj-soul.com') {
  wsHook.before = (data, url) => {
    if (!isMajsoulGateway(url)) { return data }
    try {
      const req = new XMLHttpRequest()
      sendToServer(req, `msg=req&meID=${resolveAccountId()}&game=majsoul`, data)
    } catch (err) {
      console.error(err)
    }
    return data
  }
  wsHook.after = (messageEvent, url) => {
    if (!isMajsoulGateway(url)) { return messageEvent }
    try {
      const binaryMsg = messageEvent.data as ArrayBuffer
      const req = new XMLHttpRequest()
      sendToServer(req, `msg=res&meID=${resolveAccountId()}&game=majsoul`, binaryMsg)
    } catch (err) {
      console.error(err)
    }
    return messageEvent
  }
}

if (window.location.host === 'tenhou.net') {
  const msgStringQueue: string[] = []
  let msgIndex = new Date().getTime()

  wsHook.after = (messageEvent, url) => {
    if (!url.includes('mjv.jp')) { return messageEvent }
    try {
      msgStringQueue.push(messageEvent.data as string)

      const req = new XMLHttpRequest()

      req.open('POST', `${serverURL}?msg=res&game=tenhou&i=${msgIndex++}`)

      const msgString = msgStringQueue.shift()
      if (msgString === undefined) { return messageEvent }

      const binaryMsg = new ArrayBuffer(msgString.length)
      const bufView = new Uint8Array(binaryMsg)
      for (let i = 0; i < msgString.length; i++) {
        bufView[i] = msgString.charCodeAt(i)
      }
      req.send(binaryMsg)
    } catch (err) {
      console.error(err)
    }
    return messageEvent
  }
}
