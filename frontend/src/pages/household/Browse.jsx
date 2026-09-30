import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../api';
import { DAYS, EXPERIENCE_LEVELS, PLAN_LABEL, ftime, rateText } from '../../lib/format';
import {
  Button,
  Empty,
  Field,
  Input,
  LoadState,
  Monogram,
  PageHeader,
  Pagination,
  Select,
  Seal,
  Stars,
  StatusBadge,
  useFetch,
} from '../../components/ui';

const BLANK = {
  service_type: '',
  experience_level: '',
  availability: '',
  day: '',
  plan: '',
  max_price: '',
  min_rating: '',
  city: '',
  search: '',
  sort: 'rating',
};

function HelperRow({ h }) {
  return (
    <li className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
      <Monogram name={h.name} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-xl font-semibold">{h.name}</h2>
          <Seal size={20} />
          <span className="text-sm font-medium capitalize text-ink-soft">
            {h.service_type.replace('_', ' ')}
          </span>
          <StatusBadge value={h.availability_status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <Stars value={h.avg_rating} count={h.review_count} />
          <span>
            {h.experience_years} {h.experience_years === 1 ? 'year' : 'years'} experience
          </span>
          {h.city && <span>{h.city}</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {['hourly', 'monthly', 'yearly']
            .filter((p) => h.preferred_plans.includes(p) && h[`${p}_rate`] != null)
            .map((p) => (
              <span key={p}>
                <span className="text-ink-soft">{PLAN_LABEL[p]}:</span>{' '}
                <span className="font-semibold">{rateText(p, h[`${p}_rate`])}</span>
              </span>
            ))}
        </div>
        {(h.available_days.length > 0 || h.available_from) && (
          <div className="mt-1 text-xs text-ink-soft">
            {h.available_days.join(', ')}
            {h.available_from && ` · ${ftime(h.available_from)} to ${ftime(h.available_to)}`}
          </div>
        )}
      </div>
      <Link
        to={`/browse/${h.id}`}
        className="shrink-0 rounded-lg border border-ink px-4 py-2 text-center text-sm font-semibold hover:bg-ink hover:text-white"
      >
        View profile
      </Link>
    </li>
  );
}

export default function Browse() {
  const [draft, setDraft] = useState(BLANK);
  const [applied, setApplied] = useState(BLANK);
  const [page, setPage] = useState(1);
  const cats = useFetch(() => api.get('/categories').then((r) => r.data.categories), []);
  const { data, loading, error, reload } = useFetch(
    () => api.get(`/browse/helpers${qs({ ...applied, page, limit: 10 })}`).then((r) => r.data),
    [applied, page],
  );

  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const apply = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  };
  const reset = () => {
    setDraft(BLANK);
    setApplied(BLANK);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Find a helper"
        sub="Every helper listed here has been verified by our team."
      />
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <form
          onSubmit={apply}
          className="h-fit space-y-4 rounded-xl border border-line bg-white p-5 lg:sticky lg:top-24"
          aria-label="Filters"
        >
          <Field label="Search">
            <Input placeholder="Name or keyword" value={draft.search} onChange={set('search')} />
          </Field>
          <Field label="Service">
            <Select value={draft.service_type} onChange={set('service_type')}>
              <option value="">All services</option>
              {cats.data?.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Experience">
            <Select value={draft.experience_level} onChange={set('experience_level')}>
              <option value="">Any experience</option>
              {Object.entries(EXPERIENCE_LEVELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Availability">
            <Select value={draft.availability} onChange={set('availability')}>
              <option value="">Any status</option>
              <option value="available">Available now</option>
              <option value="busy">Busy</option>
            </Select>
          </Field>
          <Field label="Works on">
            <Select value={draft.day} onChange={set('day')}>
              <option value="">Any day</option>
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Service plan">
            <Select
              value={draft.plan}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  plan: e.target.value,
                  max_price: e.target.value ? draft.max_price : '',
                })
              }
            >
              <option value="">Any plan</option>
              {Object.entries(PLAN_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          {draft.plan && (
            <Field label={`Maximum ${draft.plan} price (Rs)`}>
              <Input type="number" min={0} value={draft.max_price} onChange={set('max_price')} />
            </Field>
          )}
          <Field label="Minimum rating">
            <Select value={draft.min_rating} onChange={set('min_rating')}>
              <option value="">Any rating</option>
              {[4.5, 4, 3].map((r) => (
                <option key={r} value={r}>
                  {r} and above
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City">
            <Input value={draft.city} onChange={set('city')} />
          </Field>
          <Field label="Sort by">
            <Select value={draft.sort} onChange={set('sort')}>
              <option value="rating">Highest rated</option>
              <option value="experience">Most experienced</option>
              <option value="newest">Recently verified</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Apply filters
            </Button>
            <Button variant="secondary" onClick={reset}>
              Clear
            </Button>
          </div>
        </form>

        <div>
          <LoadState loading={loading} error={error} onRetry={reload}>
            <p className="mb-2 text-sm text-ink-soft">
              {data?.total} {data?.total === 1 ? 'helper' : 'helpers'} found
            </p>
            {data?.helpers.length === 0 ? (
              <Empty title="No helpers match these filters">
                Try removing a filter or choosing a different day or plan.
              </Empty>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {data?.helpers.map((h) => (
                  <HelperRow key={h.id} h={h} />
                ))}
              </ul>
            )}
            <Pagination page={page} pages={data?.pages} onChange={setPage} />
          </LoadState>
        </div>
      </div>
    </div>
  );
}
