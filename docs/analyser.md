# analyser

源码：`server/analyser/`

analyser 是可替换的。pipeline 会把候选动作（如有）和当前局面一起交给它，它返回一个推荐选择，以及可选的各候选分数。

默认实现是 `analyser-mahjong_helper`，包装了 [mahjong-helper](https://github.com/EndlessCheng/mahjong-helper)。

## 自己实现一个

**第一步**：在 `server/analyser/` 下新建一个目录，命名为 `analyser-<name>`，例如 `analyser-myrule`。

**第二步**：目录下导出一个继承 `BaseAnalyser` 的实例作为 `default`：

```ts
// server/analyser/analyser-myrule/index.ts
import { BaseAnalyser, type AnalyseResult } from '@/types/Analyser'
import type { MjaiActionList } from '@/types/Mjai'
import type { Round } from '@/board/Round'

class MyRuleAnalyser extends BaseAnalyser {
  async analyseActions (mjaiActionList: MjaiActionList, round: Round): Promise<AnalyseResult> {
    // mjaiActionList: 本次可选的所有 MJAI action
    // round: 当前局面（手牌、河、副露、点数等）
    const choice = mjaiActionList[0]  // 随便选第一个
    return { choice }
  }
}

export default new MyRuleAnalyser()
```

**第三步**：在 `.env` 里指定它：

```
RUNTIME_CONF_ANALYSER=analyser-myrule
```

## 接口说明

```ts
interface AnalyseResult {
  choice: MjaiAction           // 推荐动作（必填）
  scores?: Array<number | null> // 与 mjaiActionList 等长的分数，没有就省略
  info?: string                // 展示用的说明文字
}

abstract class BaseAnalyser {
  init?(): Promise<boolean>    // 可选，启动时初始化；返回 false 则终止
  end?(): Promise<void>        // 可选，结束时清理

  abstract analyseActions(
    mjaiActionList: MjaiActionList,
    round: Round
  ): Promise<AnalyseResult>
}
```

`scores` 填了的话，webui 会在候选动作旁边画出分数条。
