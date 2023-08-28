# 分析器模块

源码： `server/analyser/`

依据 gameRecords 模块记录的信息（即 Game 实例）进行分析，给出一些操作结果 (operations)。

**注：** 暂时使用 [EndlessCheng/mahjong-helper](https://github.com/EndlessCheng/mahjong-helper) 包装了一个初级分析器。效果不如机器学习的模型。希望有能力的开发者写出更有力的分析器模块。

## 输入输出

输入：
  - game.round (即 Game 实例中的当前 Round 实例，记录了当前牌桌。只读。)
  - 吃碰杠目标牌（*可能需要*）。 

输出：JSON 格式，表示操作结果。

## API

### `Analyser` 类

`Analyser` 类须继承 `BaseAnalyser` 类（`/server/types/Analyser.ts`），即必须包含如下的方法：

(注：`Tile` 类型即 '1p' '2m' '3z' 等，请参考 `server/types/General.ts`)

```ts
export abstract class BaseAnalyser {
  // 分析舍张
  // - choice：表示舍张
  // - info：无实际意义，可输出作为用户参考
  abstract analyseDiscard (round: Round): { choice: Tile, info: string }

  // 分析吃
  // - targetTile：表示要吃的那张牌（即别人打出的）
  // - choice：表示是否副露
  // - info：无实际意义，可输出作为用户参考
  abstract analyseChi (round: Round, targetTile: Tile): { choice: boolean, info: string }

  // 分析碰
  // - targetTile：表示要碰的那张牌（即别人打出的）
  // - choice：表示是否副露
  // - info：无实际意义，可输出作为用户参考
  abstract analysePeng (round: Round, targetTile: Tile): { choice: boolean, info: string }

  // 分析普通杠
  // - targetTile：表示要杠的那张牌（即别人打出的）
  // - choice：表示是否副露
  // - info：无实际意义，可输出作为用户参考
  abstract analyseGang (round: Round, targetTile: Tile): { choice: boolean, info: string }

  // 分析暗杠
  // - targetTile：表示要杠的那张牌
  // - choice：表示是否暗杠
  // - info：无实际意义，可输出作为用户参考
  abstract analyseAnGang (round: Round, targetTile: Tile): { choice: boolean, info: string }

  // 分析加杠
  // - targetTile：表示要杠的那张牌
  // - choice：表示是否加杠
  // - info：无实际意义，可输出作为用户参考
  abstract analyseAddGang (round: Round, targetTile: Tile): { choice: boolean, info: string }

  // 分析立直
  // - choice：表示是否立直
  // - discard：立直宣言牌
  // - info：无实际意义，可输出作为用户参考
  abstract analyseLiqi (round: Round): { choice: boolean, discard: Tile, info: string }

  // 分析是否选择荣和
  // - choice：表示是否选择荣和
  // - info：无实际意义，可输出作为用户参考
  abstract analyseHule (round: Round): { choice: boolean, info: string }

  // 分析是否选择自摸
  // - choice：表示是否选择自摸
  // - info：无实际意义，可输出作为用户参考
  abstract analyseZimo (round: Round): { choice: boolean, info: string }

  // 分析是否选择拔北
  // - choice：表示是否选择拔北
  // - info：无实际意义，可输出作为用户参考
  abstract analyseBabei (round: Round): { choice: boolean, info: string }
}
```
