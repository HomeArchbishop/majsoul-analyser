export declare module wsHook {
  function after (e: MessageEvent, url: string, wsObject: WebSocket): Event
  function before (data: ArrayBuffer, url: string, wsObject: WebSocket): ArrayBuffer
}
