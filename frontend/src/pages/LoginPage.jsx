import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api.js';
import { useAuth } from '../auth.jsx';

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
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Credenciales incorrectas' : err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f7fb] p-4">
      <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-r from-[#071a33] via-[#0b2545] to-[#0f3a68]" />
      <div className="absolute left-1/2 top-20 h-52 w-52 -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="-mt-14 mb-8 rounded-2xl bg-gradient-to-r from-[#0b2545] to-[#0f3a68] px-6 py-5 text-center text-white shadow-lg shadow-blue-900/30">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Bienvenido</p>
          <h1 className="mt-1 text-2xl font-bold">Sales App</h1>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="user">
          Usuario
        </label>
        <input
          id="user"
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2.5"
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
          className="mb-6 w-full rounded-xl border border-slate-300 px-3 py-2.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
