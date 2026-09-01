import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'majsoul-analyser',
  description: '雀力全开',
  base: '/majsoul-analyser/',
  themeConfig: {
    sidebar: [
      { text: '首页', link: '/' },
      { text: '雀魂消息解析器模块', link: '/majsoul' },
      { text: '牌桌记录模块', link: '/gameRecords' },
      { text: '分析器模块', link: '/analyser' },
    ],
  },
})
