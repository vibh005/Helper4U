import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, TOKEN_KEY } from '../api';
import { PageLoader } from '../components/ui';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'helper' ? '/helper/dashboard' : '/browse');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const accept = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };
  const login = async (email, password) => accept((await api.post('/auth/login', { email, password })).data);
  const register = async (body) => accept((await api.post('/auth/register', body)).data);
  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); }, []);

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthCtx.Provider>;
}

export function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
