# server sink

源码：`server/UI/`

是服务端对于 UI 的抽象。pipeline 产生局面快照和分析结果后，通过这一层往外推送。

## 对外接口（pipeline → sink）

pipeline 调用 `UI`（`server/UI/index.ts`）上的三个方法：

| 方法 | 触发时机 | 说明 |
| --- | --- | --- |
| `UI.publishBoard(game, platformId)` | 每条消息处理完 | 把 `Game` 字段拷成 `BoardSnapshot` 推出去 |
| `UI.publishAnalysis(actions, choice, info, scores?)` | analyser 返回结果时 | 把候选和推荐打包成 `AnalysisSnapshot` 推出去 |
| `UI.print(...args)` | 任意日志 | 透传给所有 sink |

消息结构（`server/UI/types.ts`）：

```ts
type UiMessage =
  | { type: 'log';      args: unknown[] }
  | { type: 'board';    snapshot: BoardSnapshot }
  | { type: 'analysis'; snapshot: AnalysisSnapshot }
```

---

## 内部 sink 机制

`UI.publishBoard` 等方法内部会把消息广播给所有注册的 sink。sink 只需实现一个接口：

```ts
interface UISink {
  onMessage(message: UiMessage): void
}
```

目前内置两个 sink：

| sink | 文件 | 做什么 |
| --- | --- | --- |
| `cliSink` | `cliSink.ts` | 把 `log` 消息打印到控制台 |
| `webSink` | `webSink.ts` | 维护 SSE 长连接，广播所有消息；缓存最新 board / analysis 供新连接补帧 |

webSink 暴露的 HTTP 端点由 `webServer.ts` 挂载：

| 端点 | 用途 |
| --- | --- |
| `GET /ui/state` | 返回当前最新 board + analysis |
| `GET /ui/events` | SSE：之后每条消息实时推送 |

webui 订阅这两个端点来驱动页面更新。

---

新增自定义 sink 只需实现 `UISink`，然后加入 `server/UI/index.ts` 里的 `sinks` 数组即可。
