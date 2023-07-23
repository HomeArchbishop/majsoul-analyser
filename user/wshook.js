/* eslint-disable no-proto */
/* eslint-disable accessor-pairs */
/* eslint-disable no-global-assign */

/* wsHook.js
 * https://github.com/skepticfx/wshook
 * Reference: http://www.w3.org/TR/2011/WD-websockets-20110419/#websocket
 */

const wsHook = {}

// Mutable MessageEvent.
// Subclasses MessageEvent and makes data, origin and other MessageEvent properites mutatble.
function MutableMessageEvent (o) {
  this.bubbles = o.bubbles || false
  this.cancelBubble = o.cancelBubble || false
  this.cancelable = o.cancelable || false
  this.currentTarget = o.currentTarget || null
  this.data = o.data || null
  this.defaultPrevented = o.defaultPrevented || false
  this.eventPhase = o.eventPhase || 0
  this.lastEventId = o.lastEventId || ''
  this.origin = o.origin || ''
  this.path = o.path || new Array(0)
  this.ports = o.parts || new Array(0)
  this.returnValue = o.returnValue || true
  this.source = o.source || null
  this.srcElement = o.srcElement || null
  this.target = o.target || null
  this.timeStamp = o.timeStamp || null
  this.type = o.type || 'message'
  this.__proto__ = o.__proto__ || MessageEvent.__proto__
}

const before = wsHook.before = function (data, url, wsObject) {
  return data
}
const after = wsHook.after = function (e, url, wsObject) {
  return e
}
const modifyUrl = wsHook.modifyUrl = function (url) {
  return url
}

wsHook.resetHooks = function () {
  wsHook.before = before
  wsHook.after = after
  wsHook.modifyUrl = modifyUrl
}

const _WS = WebSocket
WebSocket = function (url, protocols) {
  let WSObject
  url = wsHook.modifyUrl(url) || url
  this.url = url
  this.protocols = protocols
  if (!this.protocols) { WSObject = new _WS(url) } else { WSObject = new _WS(url, protocols) }

  const _send = WSObject.send
  WSObject.send = function (data) {
    arguments[0] = wsHook.before(data, WSObject.url, WSObject) || data
    _send.apply(this, arguments)
  }

  // Events needs to be proxied and bubbled down.
  WSObject._addEventListener = WSObject.addEventListener
  WSObject.addEventListener = function () {
    const eventThis = this
    // if eventName is 'message'
    if (arguments[0] === 'message') {
      arguments[1] = (function (userFunc) {
        return function instrumentAddEventListener () {
          arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
          if (arguments[0] === null) return
          userFunc.apply(eventThis, arguments)
        }
      })(arguments[1])
    }
    return WSObject._addEventListener.apply(this, arguments)
  }

  Object.defineProperty(WSObject, 'onmessage', {
    set: function () {
      const eventThis = this
      const userFunc = arguments[0]
      const onMessageHandler = function () {
        arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
        if (arguments[0] === null) return
        userFunc.apply(eventThis, arguments)
      }
      WSObject._addEventListener.apply(this, ['message', onMessageHandler, false])
    }
  })

  return WSObject
}

export { wsHook }
