// 환경 변수: .env 파일이 있으면 읽고, 이미 설정된 값(systemd/compose/k8s)은 덮어쓰지 않음
// 어느 폴더에서 실행하든 api/.env 를 읽도록 경로를 고정
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 3000);

// DB 접속 정보는 전부 환경 변수로만 받는다 (코드에 비밀번호 금지)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      done       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// compose/k8s에서는 DB가 API보다 늦게 뜰 수 있으므로 재시도
async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await initDb();
      return;
    } catch (err) {
      console.log(`DB 연결 대기 중 (${i}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('DB에 연결할 수 없습니다');
}

const app = express();
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'db_error', message: err.message });
  }
});

app.get('/api/todos', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, title, done, created_at FROM todos ORDER BY id');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/todos', async (req, res, next) => {
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title은 필수입니다' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, done, created_at',
      [title]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/todos/:id', async (req, res, next) => {
  const { done } = req.body || {};
  if (typeof done !== 'boolean') return res.status(400).json({ error: 'done(boolean)이 필요합니다' });
  try {
    const { rows } = await pool.query(
      'UPDATE todos SET done = $1 WHERE id = $2 RETURNING id, title, done, created_at',
      [done, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: '없는 할 일입니다' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/todos/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: '없는 할 일입니다' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '서버 오류' });
});

waitForDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
