import { wsHook } from './wshook'

const req = new XMLHttpRequest()
const serverURL = 'http://localhost:56556/'

wsHook.before = (data, url) => {
  if (!url.includes('/game-gateway')) { return data }
  try {
    const screenX = window.screenX + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.offsetLeft ?? 0)
    const screenY = window.screenY + window.outerHeight - window.innerHeight + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.getBoundingClientRect().y ?? 0)
    req.open('POST', `${serverURL}?msg=req&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&w=${window.layaCanvas.width ?? 0}&h=${window.layaCanvas.height ?? 0}&x=${screenX}&y=${screenY}`)
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
    const screenX = window.screenX + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.offsetLeft ?? 0)
    const screenY = window.screenY + window.outerHeight - window.innerHeight + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.getBoundingClientRect().y ?? 0)
    req.open('POST', `${serverURL}?msg=res&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&w=${window.layaCanvas.width ?? 0}&h=${window.layaCanvas.height ?? 0}&x=${screenX}&y=${screenY}`)
    req.send(binaryMsg)
  } catch (err) {
    console.error(err)
  }
  return messageEvent
}
