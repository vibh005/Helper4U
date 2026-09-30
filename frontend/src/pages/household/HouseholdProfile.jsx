import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import {
  Alert,
  Button,
  Field,
  Input,
  LoadState,
  PageHeader,
  Panel,
  Textarea,
  useFetch,
  useToast,
} from '../../components/ui';

export default function HouseholdProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(
    () => api.get('/households/me/profile').then((r) => r.data.profile),
    [],
  );
  const [acct, setAcct] = useState({
    name: user.name,
    phone: user.phone || '',
    city: user.city || '',
  });
  const [form, setForm] = useState({
    address: '',
    pincode: '',
    family_size: '',
    children_count: 0,
    has_pets: false,
    notes: '',
  });
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (data)
      setForm({
        address: data.address || '',
        pincode: data.pincode || '',
        family_size: data.family_size ?? '',
        children_count: data.children_count ?? 0,
        has_pets: !!data.has_pets,
        notes: data.notes || '',
      });
  }, [data]);

  const saveAcct = async (e) => {
    e.preventDefault();
    setBusy('acct');
    setErr('');
    try {
      const r = await api.put('/auth/me', acct);
      setUser(r.data.user);
      toast('Account details saved');
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy('');
    }
  };

  const saveHome = async (e) => {
    e.preventDefault();
    setBusy('home');
    setErr('');
    const body = {
      address: form.address,
      children_count: Number(form.children_count) || 0,
      has_pets: form.has_pets,
      notes: form.notes,
    };
    if (form.pincode) body.pincode = form.pincode;
    if (form.family_size !== '') body.family_size = Number(form.family_size);
    try {
      await api.put('/households/me/profile', body);
      toast('Household details saved');
      reload();
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="My household"
        sub="Helpers see this only after they accept a booking. Your address is used as the default service address."
      />
      {err && <Alert>{err}</Alert>}
      <LoadState loading={loading} error={error} onRetry={reload}>
        <Panel title="Account">
          <form onSubmit={saveAcct} className="grid gap-4 sm:grid-cols-3">
            <Field label="Full name">
              <Input
                required
                value={acct.name}
                onChange={(e) => setAcct({ ...acct, name: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={acct.phone}
                onChange={(e) => setAcct({ ...acct, phone: e.target.value })}
              />
            </Field>
            <Field label="City">
              <Input
                value={acct.city}
                onChange={(e) => setAcct({ ...acct, city: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" loading={busy === 'acct'}>
                Save account
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Home and family">
          <form onSubmit={saveHome} className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" className="sm:col-span-2">
              <Input
                maxLength={255}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House number, street, area"
              />
            </Field>
            <Field label="Pincode">
              <Input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                placeholder="6 digits"
              />
            </Field>
            <Field label="People in your home">
              <Input
                type="number"
                min={1}
                max={30}
                value={form.family_size}
                onChange={(e) => setForm({ ...form, family_size: e.target.value })}
              />
            </Field>
            <Field label="Children">
              <Input
                type="number"
                min={0}
                max={20}
                value={form.children_count}
                onChange={(e) => setForm({ ...form, children_count: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#1e2a5a]"
                checked={form.has_pets}
                onChange={(e) => setForm({ ...form, has_pets: e.target.checked })}
              />{' '}
              We have pets
            </label>
            <Field label="Anything a helper should know" className="sm:col-span-2">
              <Textarea
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={busy === 'home'}>
                Save household details
              </Button>
            </div>
          </form>
        </Panel>
      </LoadState>
    </div>
  );
}
