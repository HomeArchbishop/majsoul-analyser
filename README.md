# Majsoul-analyser

把雀魂牌局里的信息收成标准局面，方便复盘和对照。协议走 [MJAI](https://mjai.app/docs/mjai-protocol)。

更细的说明：`bun run docs:dev`，或看 [docs/](./docs/index.md)。

## 快速开始

```bash
bun install
bun run build:user
bun start                 # :56556
```

1. 把 `dist/majsoul-analyser.user.js` 装进油猴 / 暴力猴  
2. 先开服务，再进 [雀魂国服](https://game.maj-soul.com/1/) 牌桌  
3. 尽量从牌局开头听消息；中途才开就刷新后重进  

webui：`bun run build:web`，然后打开 <http://localhost:56556/>
