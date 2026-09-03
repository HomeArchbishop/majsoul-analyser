import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'majsoul-analyser',
    description: '立直麻将牌局观测与研习',
    base: '/',
    // mermaid ≥11.17 的 fastdom 与 Vite ESM 不兼容；钉在 11.16.1
    vite: {
      optimizeDeps: {
        include: [
          'mermaid',
          'dayjs',
          'debug',
          '@braintree/sanitize-url',
          'cytoscape',
          'cytoscape-cose-bilkent',
        ],
      },
    },
    themeConfig: {
      sidebar: [
        {
          text: '使用',
          items: [
            { text: 'Quick Start', link: '/usage' },
          ],
        },
        {
          text: '开发',
          items: [
            { text: 'Overview', link: '/architecture' },
            { text: 'user', link: '/user' },
            { text: 'platforms', link: '/platforms' },
            { text: 'board', link: '/board' },
            { text: 'analyser', link: '/analyser' },
            { text: 'server sink', link: '/server-sink' },
            { text: 'webui', link: '/webui' },
          ],
        },
      ],
    },
  }),
)
