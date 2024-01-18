npx vite build;

sed -i "1i\
// ==UserScript==\n\
// @name        雀力全开！- 雀魂自动化代打\n\
// @match       https://game.maj-soul.com/*\n\
// @match       https://tenhou.net/*\n\
// @grant       none\n\
// @version     1.0\n\
// @author      https://github.com/HomeArchbishop\n\
// @description https://github.com/HomeArchbishop/majsoul-analyser\n\
// ==/UserScript==\n\
" `dirname "$0"`/../dist/majsoul-analyser.user.js
