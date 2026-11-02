import { useEffect, useState } from 'react';

// 항상 상대 경로로 호출 → 개발(Vite proxy), VM(Nginx), K8s(Ingress) 어디서든 그대로 동작
const API = '/api/todos';

async function request(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  return res.status === 204 ? null : res.json();
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
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

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <main className="container">
      <h1>할 일</h1>

      <form onSubmit={addTodo} className="add-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          aria-label="새 할 일"
        />
        <button type="submit">추가</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">불러오는 중…</p>
      ) : todos.length === 0 ? (
        <p className="muted">할 일이 없습니다.</p>
      ) : (
        <ul className="list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo)} />
                <span>{todo.title}</span>
              </label>
              <button className="delete" onClick={() => deleteTodo(todo.id)} aria-label="삭제">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="muted footer">
        남은 일 {remaining}개 / 전체 {todos.length}개
      </p>
    </main>
  );
}
