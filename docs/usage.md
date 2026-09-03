# Quick Start

## 环境准备

- [Bun](https://bun.sh/)
- 油猴 / 暴力猴

## 安装

```bash
bun install
bun run build:user    # 得到 dist/majsoul-analyser.user.js
bun start             # 默认 56556
```

看到 `Service started at port: 56556` 就可以进游戏了。

有需要把 `.env.example` 拷成 `.env` 设置环境变量。

## 装 user 脚本

把 `dist/majsoul-analyser.user.js` 加到油猴 / 暴力猴。它会把对局里的消息转到本机服务。

## 对局中

1. 打开本地服务；
2. 打开 [雀魂](https://game.maj-soul.com/1/)，进牌桌；
3. 须从牌局开头开始；中途才开的话，需要刷新后重新进桌。

## webui

想用浏览器看牌桌：

```bash
bun run build:web
```

打开 <http://localhost:56556/>。接了 analyser 的话，页面上也会带上候选统计。
