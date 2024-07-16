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

> **【Notice】** 考虑到下列原因，已停用Bot自动点击
>
> - 2024年夏季雀魂的一次界面升级
>
> - 自动点击的cv识别不准确
>
> - 可能的自动化鼠标检测（反作弊）
>
> - 未来对天凤（tenhou）等其他平台的完整支持

## 介绍

- 自动提供帮助，处理麻将牌局

## Usage

**Step1** 安装依赖

```bash
yarn run install:dependence
```

**Step2** 构建前端注入脚本

```bash
yarn run build:user
```

**Step3** 将 `dist/majsoul-analyser.user.js` 脚本注入油猴/暴力猴中

**Step4** 开启后端服务

```bash
yarn start
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

本程序由 Typescript 编写，用 vite 构建用户浏览器脚本，用 ts-node 运行服务端

- 用户脚本，负责将雀魂的牌桌 WS 消息转发给服务端。目前仅转发对局消息，不转发Lobby类的消息。

- 服务器由主入口启动，将收到的二进制消息转发给消息处理器（server/msgHandler.ts），通过雀魂消息解析器模块 (server/majsoul)、牌桌记录模块 (server/gameRecords)、分析器模块 (server/analyser)、自动操作模块 (server/bot)贯通处理
  
  雀魂消息解析器模块 (server/majsoul)：解析雀魂的二进制消息，解析规则可能有更新而导致这一块解析出错，届时请及时提醒开发者更新。
  
  牌桌记录模块 (server/gameRecords)：记录对局状态。因为雀魂的消息是流程化的，也就是每一条消息只会告诉前端这一步的动作，而非牌桌信息，所以需要记录流程。
  
  分析器模块 (server/analyser)：暂时使用 [mahjong-helper
  ](https://github.com/EndlessCheng/mahjong-helper) 包装了一个初级分析器，返回一些操作结果 (operations)
  
  自动操作模块 (server/bot)：使用 opencv.js 识别桌面，并通过 robot.js 操作鼠标点击
