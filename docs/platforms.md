# platforms

源码：`server/platforms/`

平台适配器，将各平台原始消息转成 MJAI，供后面的模块使用。

```mermaid
flowchart LR
  RAW[platform msg] --> DEC[decode]
  DEC --> TO[toMjai]
  TO --> EVT[MjaiEvent]
```

| 实现 | 状态 | 说明 |
| --- | --- | --- |
| `platforms/majsoul` | 可用 | protobuf 解包 + `toMjai` |
| `platforms/tenhou` | 开发中 | 同样输出 MJAI |

均在 `platforms/registry.ts` 内注册。
