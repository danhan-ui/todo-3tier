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

1. PostgreSQL에 계정/DB 만들기 (psql에서)

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

웹 개발 서버는 `/api` 요청을 `http://localhost:3000`으로 전달합니다 (`web/vite.config.js`).
배포할 때는 `npm run build`로 만든 `web/dist/`를 Nginx가 제공하고, `/api`는 Nginx(2단계) 또는 Ingress(4단계)가 API로 전달합니다.
