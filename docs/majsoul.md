# 雀魂消息解析器模块

源码：`server/majsoul/`

将雀魂的二进制消息还原为**雀魂专属** JSON 格式。

## 补充说明：

为什么称为“雀魂专属”？雀魂使用了 protobuf 将 JSON 数据包装成二进制数据发送。

这一模块仅仅是解包雀魂的二进制消息。如果要支持其他麻将平台（如天凤），仅重写这个模块是不行的，还需要重写下一个模块（牌桌记录模块 gameRecords），因为其直接调用了雀魂的 JSON 结构。

[issue #2](https://github.com/HomeArchbishop/majsoul-analyser/issues/2) 提出了 “*有自己的一套标准，就可以兼容多个平台了*” 。接下来考虑在本模块和（gameRecords）之间添加一个格式化模块（如下图）。

![todo1](./todo1.png)

## 输入输出

输入：雀魂二进制消息

输出：雀魂 JSON 消息
