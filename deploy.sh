#!/usr/bin/env sh

set -e

bun run docs:build

cd docs/.vitepress/dist

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:HomeArchbishop/majsoul-analyser.git master:gh-pages

cd -
