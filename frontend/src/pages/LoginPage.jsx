import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api.js';
import { getRoleFromToken, useAuth } from '../auth.jsx';

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Debes ingresar usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      const res = await apiLogin(username, password);
      if (res?.status !== 'success') {
        setError(res?.message || 'Credenciales inválidas');
        return;
      }
      login(res.data.token, res.data.user);
      const effectiveRole = res.data.user?.role || getRoleFromToken(res.data.token);
      navigate(effectiveRole === 'user' ? '/sales' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Credenciales incorrectas' : err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Sales App</h1>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="user">
          Usuario
        </label>
        <input
          id="user"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="pass">
          Contraseña
        </label>
        <input
          id="pass"
          type="password"
          className="mb-6 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
