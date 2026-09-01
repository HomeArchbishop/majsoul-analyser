import { wsHook } from './wshook'

const serverURL = 'http://localhost:56556/'

function sendToServer (query: string, body: ArrayBuffer | Document | Blob | BufferSource | FormData | URLSearchParams | string | null): void {
  const req = new XMLHttpRequest()
  req.open('POST', `${serverURL}?${query}`)
  req.send(body)
}

function isGameGateway (url: string): boolean {
  return url.includes('/game-gateway') || url.includes('/ws-gateway')
}

if (window.location.host === 'game.maj-soul.com') {
  wsHook.before = (data, url) => {
    if (!isGameGateway(url)) { return data }
    try {
      sendToServer('msg=req&game=majsoul', data)
    } catch (err) {
      console.error(err)
    }
    return data
  }
  wsHook.after = (messageEvent, url) => {
    if (!isGameGateway(url)) { return messageEvent }
    try {
      sendToServer('msg=res&game=majsoul', messageEvent.data as ArrayBuffer)
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

      const msgString = msgStringQueue.shift()
      if (msgString === undefined) { return messageEvent }

      const binaryMsg = new ArrayBuffer(msgString.length)
      const bufView = new Uint8Array(binaryMsg)
      for (let i = 0; i < msgString.length; i++) {
        bufView[i] = msgString.charCodeAt(i)
      }
      sendToServer(`msg=res&game=tenhou&i=${msgIndex++}`, binaryMsg)
    } catch (err) {
      console.error(err)
    }
    return messageEvent
  }
}
