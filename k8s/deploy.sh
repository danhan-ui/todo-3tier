#!/usr/bin/env bash
# 4단계: kind 클러스터 'lab' 에 배포. 저장소 루트에서  bash k8s/deploy.sh
#   - 이미지: 3단계에서 만든 todo-api:1.0 / todo-web:1.0 (없으면 docker compose build)
#   - DB 비밀번호: 루트 .env 의 DB_PASSWORD → Secret 'todo-db'
set -euo pipefail
export PATH="$HOME/.local/share/mise/shims:$PATH"   # lab VM은 kind/kubectl을 mise로 설치

cd "$(dirname "$0")/.."
CLUSTER=lab
NS=todo-3tier

[ -f .env ] || { echo ".env 가 없습니다 (.env.example 참고)"; exit 1; }
set -a; . ./.env; set +a

# 1) 이미지 → kind
docker image inspect todo-api:1.0 todo-web:1.0 >/dev/null 2>&1 || docker compose build
kind load docker-image todo-api:1.0 todo-web:1.0 --name "$CLUSTER"

# 2) 네임스페이스 + Secret (매니페스트 파일에는 비밀번호를 쓰지 않는다)
kubectl apply -f k8s/00-namespace.yaml
kubectl -n "$NS" create secret generic todo-db \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# 3) 나머지 리소스
kubectl apply -f k8s/

# 이미지를 같은 태그로 다시 넣었을 때 새 이미지로 바뀌도록 재시작
kubectl -n "$NS" rollout restart deploy/api deploy/web
kubectl -n "$NS" rollout status deploy/db --timeout=180s
kubectl -n "$NS" rollout status deploy/api --timeout=180s
kubectl -n "$NS" rollout status deploy/web --timeout=120s

kubectl -n "$NS" get pods,svc,pvc,ingress
echo "==> health: $(curl -s localhost/api/health)"
echo "==> todos : $(curl -s localhost/api/todos)"
