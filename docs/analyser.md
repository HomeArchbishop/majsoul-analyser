# 分析器模块

源码：`server/analyser/`

依据 `gameRecords` 模块记录的牌桌状态（`Round` 实例），从 MJAI action 列表中选出推荐操作。

默认实现：`analyser-mahjong_helper`（包装 [mahjong-helper](https://github.com/EndlessCheng/mahjong-helper)）。

## 数据流

1. 雀魂解析器输出 `ActionCandidateList`（粗粒度备选，如「可打任意手牌」）
2. `detailizeActionCandidateList()` 结合当前 `Round` 细化为 `MjaiActionList`
3. 具体分析器从 `MjaiActionList` 中返回 `{ choice, info? }`

牌面编码使用标准 MJAI romaji（如 `1m`、`E`、`5mr`），类型定义见 `server/types/Mjai.ts`。

## API

分析器须继承 `BaseAnalyser`（`server/types/Analyser.ts`）：

```ts
export abstract class BaseAnalyser {
  init?: (...args: any) => Promise<boolean>
  end?: (...args: any) => Promise<void>

  abstract analyseOperations (
    mjaiActionList: MjaiActionList,
    round: Round
  ): Promise<{ choice: MjaiAction, info?: string }>
}
```

新增分析器：在 `server/analyser/` 下创建 `analyser-<name>/` 目录并导出 `default`，在 `.env` 中设置 `RUNTIME_CONF_ANALYSER=analyser-<name>`。
