import { wsHook } from './wshook'

const serverURL = 'http://localhost:56556/'

if (window.location.host === 'game.maj-soul.com') {
  wsHook.before = (data, url) => {
    if (!url.includes('/game-gateway')) { return data }
    try {
      const req = new XMLHttpRequest()
      req.open('POST', `${serverURL}?msg=req&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&game=majsoul`)
      req.send(data)
    } catch (err) {
      console.error(err)
    }
    return data
  }
  wsHook.after = (messageEvent, url) => {
    if (!url.includes('/game-gateway')) { return messageEvent }
    try {
      const binaryMsg = messageEvent.data as ArrayBuffer
      const req = new XMLHttpRequest()
      req.open('POST', `${serverURL}?msg=res&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&game=majsoul`)
      req.send(binaryMsg)
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
