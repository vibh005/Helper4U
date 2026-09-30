import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext';
import { errMsg } from '../api';
import { Alert, Button, Field, Input } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(form.email, form.password);
      navigate(state?.from || homeFor(u.role), { replace: true });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-1 text-ink-soft">Welcome back. Enter your email and password to continue.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-line bg-white p-6">
        {error && <Alert>{error}</Alert>}
        <Field label="Email"><Input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Button type="submit" loading={busy} className="w-full">Log in</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-soft">New to Helper4U? <Link to="/register" className="font-semibold text-ink underline">Create an account</Link></p>
    </div>
  );
}
