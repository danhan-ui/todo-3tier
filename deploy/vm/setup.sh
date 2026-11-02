#!/usr/bin/env bash
# 2단계: VM(Ubuntu)에 Todo 앱을 직접 설치한다. 여러 번 실행해도 안전함.
#   사용법: 저장소를 clone 한 폴더에서  bash deploy/vm/setup.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_USER="$(whoami)"
WEB_ROOT=/var/www/todo
NODE_MAJOR=22

echo "==> 저장소: $REPO_DIR / 실행 계정: $RUN_USER"

# 1) 패키지: Nginx, PostgreSQL, Node.js
sudo apt-get update -y
sudo apt-get install -y nginx postgresql curl ca-certificates

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "node $(node -v), npm $(npm -v)"

# 2) api/.env (없으면 무작위 비밀번호로 생성; Git에는 올라가지 않음)
ENV_FILE="$REPO_DIR/api/.env"
if [ ! -f "$ENV_FILE" ]; then
  sed "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" "$REPO_DIR/api/.env.example" \
    | grep -v '^#' > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "==> api/.env 생성"
fi
set -a; . "$ENV_FILE"; set +a

# 3) DB 계정/DB
sudo systemctl enable --now postgresql
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE "${DB_USER}" LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE "${DB_USER}" WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END \$\$;
SQL
if [ "$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")" != "1" ]; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

# 4) 의존성 설치 + 웹 빌드
(cd "$REPO_DIR/api" && npm ci --omit=dev)
(cd "$REPO_DIR/web" && npm ci && npm run build)
sudo mkdir -p "$WEB_ROOT"
sudo rm -rf "${WEB_ROOT:?}"/*
sudo cp -r "$REPO_DIR/web/dist/." "$WEB_ROOT/"

# 5) API를 systemd 서비스로 등록 (재부팅 후 자동 시작)
sed -e "s|__USER__|$RUN_USER|g" -e "s|__API_DIR__|$REPO_DIR/api|g" -e "s|__NODE__|$(command -v node)|g" \
  "$REPO_DIR/deploy/vm/todo-api.service" | sudo tee /etc/systemd/system/todo-api.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable todo-api
sudo systemctl restart todo-api

# 6) Nginx: / 는 정적 파일, /api 는 API(3000)로 전달
sudo cp "$REPO_DIR/deploy/vm/nginx-todo.conf" /etc/nginx/sites-available/todo
sudo ln -sf /etc/nginx/sites-available/todo /etc/nginx/sites-enabled/todo
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

# 7) 확인
for i in $(seq 1 15); do
  curl -fs http://localhost/api/health >/dev/null && break
  sleep 1
done
echo "==> health: $(curl -s http://localhost/api/health)"
echo "==> todos : $(curl -s http://localhost/api/todos)"
