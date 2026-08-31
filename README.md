# Majsoul-analyser 雀力展开！<sup>v2.x</sup>

> 2023-7 project started
> 
> 23-08-18 修复了由于命令行应用造成的线程阻塞
> 
> 23-12-3 发布Ma2: 重新组织业务逻辑。统一支持 [Mjai Protocol](https://mjai.app/docs/mjai-protocol)。降低代码耦合度
>
> 【这个项目还在更新，请及时关注。有想法和 Bug 欢迎 issue。】

平台支持: 

- Darwin (MacOS)
- Windows (test on Windows 11, works fine)
- Linux 正在测试

游戏支持：

- 雀魂 / Majsoul / MahjongSoul
- 天凤 / Tenhou (正在开发)

> **【Notice】** 本项目仅提供对局分析与操作建议，不包含自动点击功能。

## 介绍

- 解析雀魂牌局消息，记录牌桌状态，并给出操作建议

## Usage

**Step1** 安装依赖

```bash
bun run install:dependence
```

**Step2** 构建前端注入脚本

```bash
bun run build:user
```

**Step3** 将 `dist/majsoul-analyser.user.js` 脚本注入油猴/暴力猴中

**Step4** 开启后端服务

```bash
bun start
# 直到出现 'Service started at port: xxxxx' 才真正开始
```

**Step5** 打开雀魂网页（国服）[game.maj-soul.com](https://game.maj-soul.com)

**注意**：一定要先启动服务，再进入游戏。由于雀魂服务器的消息特性，本程序不能从对局中途开始监听（但是刷新网页后重新进入可以）

> 例如：
> 
> (x) 开局摸完牌了 -> 开启助手
> 
> (√) 开局摸完牌了 -> 开启助手 -> 刷新网页重进牌桌

## 实现讲解

本程序由 Typescript 编写，用 vite 构建用户浏览器脚本，用 bun 运行服务端

- 用户脚本，负责将雀魂的牌桌 WS 消息转发给服务端。目前仅转发对局消息，不转发Lobby类的消息。

- 服务器由主入口启动，将收到的二进制消息转发给消息处理器（`server/msgHandler.ts`），通过雀魂消息解析器模块 (`server/majsoul`)、牌桌记录模块 (`server/gameRecords`)、分析器模块 (`server/analyser`) 贯通处理
  
  雀魂消息解析器模块 (`server/majsoul`)：解析雀魂的二进制消息，输出标准 MJAI 事件。
  
  牌桌记录模块 (`server/gameRecords`)：根据 MJAI 事件流记录对局状态。
  
  分析器模块 (`server/analyser`)：使用 [mahjong-helper](https://github.com/EndlessCheng/mahjong-helper) 包装了一个初级分析器，返回 MJAI action 建议。
