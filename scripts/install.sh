which bun >/dev/null 2>&1
if [ $? -eq 0 ]; then
  bun install
else
  echo -e "\033[41;37mERR: \033[0m This project uses bun. Please install bun first, see https://bun.sh"
fi
