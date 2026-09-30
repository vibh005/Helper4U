import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext';
import { errMsg } from '../api';
import { Alert, Button, Field, Input, cx } from '../components/ui';

const ROLES = [
  ['household', 'I need help at home', 'Find and book verified maids, babysitters and nannies.'],
  [
    'helper',
    'I offer home services',
    'Create a profile, get verified and receive booking requests.',
  ],
];

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    role: params.get('role') === 'helper' ? 'helper' : 'household',
    name: '',
    email: '',
    phone: '',
    city: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await register(form);
      navigate(u.role === 'helper' ? '/helper/profile' : '/household/profile', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-line bg-white p-6">
        {error && <Alert>{error}</Alert>}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">I am signing up as</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map(([value, title, desc]) => (
              <label
                key={value}
                className={cx(
                  'cursor-pointer rounded-lg border p-4 transition-colors',
                  form.role === value
                    ? 'border-ink bg-wash ring-2 ring-ink'
                    : 'border-line hover:bg-wash',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={form.role === value}
                  onChange={set('role')}
                  className="sr-only"
                />
                <span className="block font-display font-semibold">{title}</span>
                <span className="mt-1 block text-sm text-ink-soft">{desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Full name">
          <Input
            required
            maxLength={80}
            autoComplete="name"
            value={form.name}
            onChange={set('name')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
            />
          </Field>
          <Field label="Phone">
            <Input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="City">
            <Input autoComplete="address-level2" value={form.city} onChange={set('city')} />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
            />
          </Field>
        </div>
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-ink underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
