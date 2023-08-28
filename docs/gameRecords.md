# 牌桌记录模块

源码：`server/gameRecords/`

记录牌桌的信息。详细结构请参考 `server/gameRecords/Game.ts`。

开局开始时会创建一个 Game 实例。以后每牌开始时会在 Game 实例内创建一个新的 Round 实例。终局时销毁 Game 实例。

## 输入输出

输入：雀魂 JSON 消息（下一步改进见 [补充说明](./majsoul.md#补充说明)）

输出：无，但修改了 Game 实例
