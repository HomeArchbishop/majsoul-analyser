which yarn >/dev/null 2>&1
if [ $? -eq 0 ]; then
  yarn
else
  echo -e "\033[41;37mERR: \033[0m This project uses yarn. Please install yarn first, run \`npm i -g yarn\`"
fi
