import { useEffect, useState } from 'react';

// 항상 상대 경로로 호출 → 개발(Vite proxy), VM(Nginx), K8s(Ingress) 어디서든 그대로 동작
const API = '/api/todos';

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '진행 중' },
  { key: 'done', label: '완료' },
];

async function request(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  return res.status === 204 ? null : res.json();
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function today() {
  return new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request(API)
      .then(setTodos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function addTodo(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    try {
      const created = await request(API, { method: 'POST', body: JSON.stringify({ title: t }) });
      setTodos((prev) => [...prev, created]);
      setTitle('');
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleTodo(todo) {
    try {
      const updated = await request(`${API}/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: !todo.done }),
      });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteTodo(id) {
    try {
      await request(`${API}/${id}`, { method: 'DELETE' });
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function clearDone() {
    const done = todos.filter((t) => t.done);
    try {
      await Promise.all(done.map((t) => request(`${API}/${t.id}`, { method: 'DELETE' })));
      setTodos((prev) => prev.filter((t) => !t.done));
    } catch (e) {
      setError(e.message);
    }
  }

  const doneCount = todos.filter((t) => t.done).length;
  const remaining = todos.length - doneCount;
  const progress = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;
  const visible = todos.filter((t) =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  );

  return (
    <div className="page">
      <main className="card">
        <header className="header">
          <div>
            <p className="date">{today()}</p>
            <h1>오늘의 할 일</h1>
          </div>
          <div className="ring" style={{ '--p': progress }} aria-label={`진행률 ${progress}%`}>
            <span>{progress}%</span>
          </div>
        </header>

        <form onSubmit={addTodo} className="add-form">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="새로운 할 일을 입력하세요"
            aria-label="새 할 일"
          />
          <button type="submit" disabled={!title.trim()} aria-label="추가">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        <nav className="filters" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={filter === f.key ? 'active' : ''}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="count">
                {f.key === 'all' ? todos.length : f.key === 'active' ? remaining : doneCount}
              </span>
            </button>
          ))}
        </nav>

        {error && (
          <p className="error" role="alert">
            {error}
            <button onClick={() => setError('')} aria-label="닫기">✕</button>
          </p>
        )}

        {loading ? (
          <ul className="list">
            {[0, 1, 2].map((i) => <li key={i} className="skeleton" />)}
          </ul>
        ) : visible.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{filter === 'done' ? '🌱' : '✨'}</div>
            <p>
              {todos.length === 0
                ? '아직 할 일이 없어요. 첫 할 일을 추가해 보세요!'
                : filter === 'done'
                ? '완료한 일이 아직 없어요.'
                : '모두 끝냈어요! 수고했어요 🎉'}
            </p>
          </div>
        ) : (
          <ul className="list">
            {visible.map((todo) => (
              <li key={todo.id} className={`item ${todo.done ? 'done' : ''}`}>
                <button
                  className="check"
                  onClick={() => toggleTodo(todo)}
                  aria-label={todo.done ? '완료 취소' : '완료'}
                  aria-pressed={todo.done}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="text" onClick={() => toggleTodo(todo)}>
                  <span className="title">{todo.title}</span>
                  <span className="meta">{formatDate(todo.created_at)}</span>
                </div>
                <button className="delete" onClick={() => deleteTodo(todo.id)} aria-label="삭제">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="footer">
          <span>남은 일 <strong>{remaining}</strong>개</span>
          {doneCount > 0 && (
            <button className="clear" onClick={clearDone}>완료한 일 지우기</button>
          )}
        </footer>
      </main>
    </div>
  );
}
