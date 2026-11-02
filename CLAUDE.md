# Todo 3티어 앱

- 구조: `web/` (React + Vite) → `api/` (Node.js Express) → PostgreSQL
- API 경로는 모두 `/api/...` 접두사를 유지한다. Nginx / Ingress에서 경로를 다시 쓰지 않아도 되게 하기 위함.
- web은 항상 상대 경로(`/api/todos`)로 호출한다. API 주소를 코드에 넣지 않는다.
- DB 접속 정보(주소, 계정, 비밀번호)는 반드시 환경 변수(`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)로 받는다. 코드·커밋에 비밀번호를 쓰지 않는다.
- `.env`는 Git에 올리지 않는다. 예시는 `.env.example`에 둔다.
- 테이블은 API 시작 시 `CREATE TABLE IF NOT EXISTS`로 만든다.
