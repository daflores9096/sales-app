import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { clearSession, getStoredUser, getToken, setSession } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  const login = useCallback((token, userData) => {
    setSession(token, userData);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!getToken(),
      login,
      logout,
      role: user?.role ?? null,
      isAdminLike: user?.role === 'admin' || user?.role === 'superadmin',
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function RequireRole({ roles, children }) {
  const { role } = useAuth();
  if (!roles.includes(role)) {
    return <Navigate to="/sales" replace />;
  }
  return children;
}

export function HomeRedirect() {
  const { role } = useAuth();
  if (role === 'user') return <Navigate to="/sales" replace />;
  return <Navigate to="/dashboard" replace />;
}

export function getRoleFromToken(token) {
  try {
    const decoded = jwtDecode(token);
    return decoded?.role ?? null;
  } catch {
    return null;
  }
}
