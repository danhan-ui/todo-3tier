# Todo 앱 (3티어)

| 티어 | 폴더 | 기술 |
|---|---|---|
| 웹 | `web/` | React + Vite |
| API | `api/` | Node.js + Express |
| DB | - | PostgreSQL |

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인 (DB 연결 포함) |
| GET | `/api/todos` | 목록 |
| POST | `/api/todos` | 추가 `{ "title": "..." }` |
| PATCH | `/api/todos/:id` | 완료 표시 `{ "done": true }` |
| DELETE | `/api/todos/:id` | 삭제 |

## 환경 변수 (api)

| 이름 | 기본값 | 설명 |
|---|---|---|
| `PORT` | 3000 | API 포트 |
| `DB_HOST` | localhost | DB 주소 |
| `DB_PORT` | 5432 | DB 포트 |
| `DB_USER` | - | DB 계정 |
| `DB_PASSWORD` | - | DB 비밀번호 |
| `DB_NAME` | - | DB 이름 |

## 1단계: 로컬 실행

> Windows PowerShell에서 `npm`이 "스크립트를 실행할 수 없으므로" 오류를 내면 `npm.cmd`로 실행하세요.

1. PostgreSQL에 계정/DB 만들기
   - Windows: `api/.env`를 만든 뒤 `powershell -ExecutionPolicy Bypass -File .\scripts\init-local-db.ps1` (postgres 관리자 비밀번호를 물어봄)
   - 또는 psql에 postgres로 접속해서 직접:

   ```sql
   CREATE USER todo WITH PASSWORD '원하는비밀번호';
   CREATE DATABASE todo OWNER todo;
   ```

2. API

   ```bash
   cd api
   cp .env.example .env   # 비밀번호 수정
   npm install
   npm start
   ```

3. 웹 (새 터미널)

   ```bash
   cd web
   npm install
   npm run dev
   ```

4. 브라우저에서 http://localhost:5173 → 할 일 추가 → 새로고침해도 남아 있으면 성공

## 2단계: VM에 직접 설치

VM(Ubuntu)에서:

```bash
git clone <저장소 URL> ~/todo
cd ~/todo
bash deploy/vm/setup.sh
```

`setup.sh`가 하는 일:
- apt로 Nginx·PostgreSQL 설치, NodeSource로 Node.js 22 설치
- `api/.env`가 없으면 무작위 DB 비밀번호로 만들고, 그 값으로 DB 계정/DB 생성
- `web`을 빌드해서 `/var/www/todo`에 복사 → Nginx가 제공 (`deploy/vm/nginx-todo.conf`)
- API를 systemd 서비스 `todo-api`로 등록 (`deploy/vm/todo-api.service`) → 재부팅 후 자동 시작
- Nginx가 `/api/`를 `127.0.0.1:3000`으로 전달

확인:

```bash
curl localhost/api/todos
sudo reboot        # 다시 접속 후
curl localhost/api/todos
systemctl status todo-api
```

브라우저: VS Code Remote-SSH의 **PORTS** 탭에서 80번 포트를 전달하고 열기.

---

웹 개발 서버는 `/api` 요청을 `http://localhost:3000`으로 전달합니다 (`web/vite.config.js`).
배포할 때는 `npm run build`로 만든 `web/dist/`를 Nginx가 제공하고, `/api`는 Nginx(2단계) 또는 Ingress(4단계)가 API로 전달합니다.
