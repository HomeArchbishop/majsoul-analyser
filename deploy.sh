#!/usr/bin/env sh

set -e

npx vuepress build docs

cd docs/.vuepress/dist

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:HomeArchbishop/majsoul-analyser.git master:gh-pages

cd -
