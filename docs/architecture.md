# Overview

<br />

<div style="display: flex; gap: 0;">
  <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/-Vite-646CFF?style=flat-square" alt="Vite" />
  <img src="https://img.shields.io/badge/-Bun-44aaff?style=flat-square" alt="Bun" />
</div>

## Pipeline

平台消息先变成 [MJAI](https://mjai.app/docs/mjai-protocol)，供 board / analyser 使用。

```mermaid
flowchart TB
  subgraph user ["user"]
    US[user]
  end

  subgraph server ["server"]
    PL[platforms]
    BD[board]
    AN[analyser]
    UI[sink]
    PL -->|MJAI| BD
    BD --> AN
    BD --> UI
    AN --> UI
  end

  subgraph webui ["webui"]
    WEB[webui]
  end

  US -->|game messages| PL
  UI -->|SSE| WEB
```

| Module | Path | 职责 |
| --- | --- | --- |
| [user](./user) | `user/` | 转发平台对局消息 |
| [platforms](./platforms) | `server/platforms/` | 平台消息 → MJAI |
| [board](./board) | `server/board/` | 维护 `Game` / `Round` |
| [analyser](./analyser) | `server/analyser/` | 分析、统计 |
| [server sink](./server-sink) | `server/UI/` | 推送快照给浏览器 |
| [webui](./webui) | `web/` | 网页画牌桌 |

流水线在 `server/pipeline/Pipeline.ts`：platforms → board → analyser → UI。

局面以 **board** 为准；**UI** 负责推送；怎么画交给 **webui**。
