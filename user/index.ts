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

/** UI **/
const uiDOM = document.createElement('div')
const headerDOM = document.createElement('div')
const bodyDOM = document.createElement('div')
const line1 = document.createElement('div')
const line1text = document.createTextNode('自动下一场')
const line1opt = document.createElement('div')
const line2 = document.createElement('div')
const line2text = document.createTextNode('bot代打')
const line2opt = document.createElement('div')

line1.append(line1text, line1opt)
line2.append(line2text, line2opt)
bodyDOM.append(line1)
bodyDOM.append(line2)
uiDOM.append(headerDOM, bodyDOM)
document.body.append(uiDOM)

uiDOM.style.position = 'fixed'
uiDOM.style.top = '0'
uiDOM.style.left = '0'
uiDOM.style.zIndex = '100'
uiDOM.style.width = '130px'
uiDOM.style.userSelect = 'none'
headerDOM.style.width = '130px'
headerDOM.style.height = '20px'
headerDOM.style.background = 'red'
bodyDOM.style.width = '130px'
bodyDOM.style.boxSizing = 'border-box'
bodyDOM.style.padding = '4px'
bodyDOM.style.background = '#00ff0044'
line1.style.width = '100%'
line1.style.height = '20px'
line1.style.color = '#4f4f4f'
line1.style.fontSize = '16px'
line1.style.display = 'flex'
line1.style.justifyContent = 'space-between'
line1.style.alignItems = 'center'
line1.style.fontSize = '16px'
line1.style.fontSize = '16px'
line1opt.style.width = line1opt.style.height = '12px'
line1opt.style.border = '1px solid #4f4f4f'
line2.style.width = '100%'
line2.style.height = '20px'
line2.style.color = '#4f4f4f'
line2.style.fontSize = '16px'
line2.style.display = 'flex'
line2.style.justifyContent = 'space-between'
line2.style.alignItems = 'center'
line2.style.fontSize = '16px'
line2.style.fontSize = '16px'
line2opt.style.width = line2opt.style.height = '12px'
line2opt.style.border = '1px solid #4f4f4f'

let isDown = false
let offsetY = 0
let offsetX = 0
headerDOM.addEventListener('mousedown', (e) => {
  isDown = true
  offsetY = e.offsetY
  offsetX = e.offsetX
})
headerDOM.addEventListener('mouseup', () => { isDown = false })
window.addEventListener('mousemove', (e) => {
  if (!isDown) { return }
  uiDOM.style.top = `${e.clientY - offsetY}px`
  uiDOM.style.left = `${e.clientX - offsetX}px`
})

let autoGame = false
line1opt.addEventListener('click', () => {
  autoGame = !autoGame
  line1opt.style.background = autoGame ? '#4f4f4f' : 'transparent'
})

let useBot = false
line2opt.addEventListener('click', () => {
  useBot = !useBot
  line2opt.style.background = useBot ? '#4f4f4f' : 'transparent'
})
/** UI END **/

if (window.location.host === 'game.maj-soul.com') {
  wsHook.before = (data, url) => {
    if (!url.includes('/game-gateway')) { return data }
    try {
      const screenX = window.screenX + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.offsetLeft ?? 0) / window.devicePixelRatio
      const screenY = window.screenY + window.outerHeight - window.innerHeight + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.getBoundingClientRect().y ?? 0)
      const w = (window.layaCanvas.width ?? 0) / window.devicePixelRatio
      const h = (window.layaCanvas.height ?? 0) / window.devicePixelRatio
      const dpi = window.devicePixelRatio
      req.open('POST', `${serverURL}?msg=req&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}\
&w=${w}&h=${h}&x=${screenX}&y=${screenY}&f=${String(isWindowFocus)}&dpi=${dpi}&ag=${String(autoGame)}&jian=${1}&chang=${2}&game=majsoul&bot=${String(useBot)}`)
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
      const dpi = window.devicePixelRatio
      req.open('POST', `${serverURL}?msg=res&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}
&w=${w}&h=${h}&x=${screenX}&y=${screenY}&f=${String(isWindowFocus)}&dpi=${dpi}&ag=${String(autoGame)}&jian=${1}&chang=${2}&game=majsoul&bot=${String(useBot)}`)
      req.send(binaryMsg)
    } catch (err) {
      console.error(err)
    }
    return messageEvent
  }
}

if (window.location.host === 'tenhou.net') {
  wsHook.after = (messageEvent, url) => {
    if (!url.includes('mjv.jp')) { return messageEvent }
    try {
      const msgString = messageEvent.data as string
      req.open('POST', `${serverURL}?msg=res&game=tenhou`)

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
