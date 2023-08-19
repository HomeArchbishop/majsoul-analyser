import { wsHook } from './wshook'

const req = new XMLHttpRequest()
const serverURL = 'http://localhost:56556/'

let isWindowFocus: boolean = window.document.hasFocus()
window.onfocus = () => {
  isWindowFocus = true
}
window.onblur = () => {
  isWindowFocus = false
}

wsHook.before = (data, url) => {
  if (!url.includes('/game-gateway')) { return data }
  try {
    const screenX = window.screenX + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.offsetLeft ?? 0) / window.devicePixelRatio
    const screenY = window.screenY + window.outerHeight - window.innerHeight + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.getBoundingClientRect().y ?? 0)
    const w = (window.layaCanvas.width ?? 0) / window.devicePixelRatio
    const h = (window.layaCanvas.height ?? 0) / window.devicePixelRatio
    const autoGame = 'false'
    const dpi = window.devicePixelRatio
    req.open('POST', `${serverURL}?msg=req&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&w=${w}&h=${h}&x=${screenX}&y=${screenY}&f=${String(isWindowFocus)}&dpi=${dpi}&ag=${autoGame}`)
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
    const screenX = window.screenX + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.offsetLeft ?? 0) / window.devicePixelRatio
    const screenY = window.screenY + window.outerHeight - window.innerHeight + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.getBoundingClientRect().y ?? 0)
    const w = (window.layaCanvas.width ?? 0) / window.devicePixelRatio
    const h = (window.layaCanvas.height ?? 0) / window.devicePixelRatio
    const autoGame = 'false'
    const dpi = window.devicePixelRatio
    req.open('POST', `${serverURL}?msg=res&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&w=${w}&h=${h}&x=${screenX}&y=${screenY}&f=${String(isWindowFocus)}&dpi=${dpi}&ag=${autoGame}`)
    req.send(binaryMsg)
  } catch (err) {
    console.error(err)
  }
  return messageEvent
}
