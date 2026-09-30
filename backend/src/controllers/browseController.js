const Browse = require('../db/browseModel');
const Stats = require('../db/statsModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPaging, pageMeta } = require('../utils/pagination');
const { PLANS, DAYS, AVAILABILITY } = require('../utils/constants');

const LEVELS = { entry: [0, 2], intermediate: [3, 5], expert: [6, undefined] };
const SORTS = ['rating', 'experience', 'newest', 'price_asc', 'price_desc'];

const num = (v, name, { min = 0, max = 1e7, int = false } = {}) => {
  const n = Number(v);
  if (v === '' || !Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) {
    throw new AppError(`${name} must be a valid number`);
  }
  return n;
};
const oneOf = (v, name, list) => {
  if (!list.includes(v)) throw new AppError(`${name} must be one of: ${list.join(', ')}`);
  return v;
};

exports.listHelpers = asyncHandler(async (req, res) => {
  const q = req.query;
  const f = {};

  if (q.service_type) {
    if (!/^[a-z0-9_]{1,30}$/.test(q.service_type)) throw new AppError('Invalid service_type');
    f.service_type = q.service_type;
  }
  if (q.experience_level) {
    const [min, max] = LEVELS[oneOf(q.experience_level, 'experience_level', Object.keys(LEVELS))];
    f.min_experience = min;
    f.max_experience = max;
  }
  if (q.min_experience !== undefined) {
    f.min_experience = Math.max(
      f.min_experience ?? 0,
      num(q.min_experience, 'min_experience', { max: 60, int: true }),
    );
  }
  if (q.availability) f.availability = oneOf(q.availability, 'availability', AVAILABILITY);
  if (q.day) f.day = oneOf(q.day, 'day', DAYS);
  if (q.plan) f.plan = oneOf(q.plan, 'plan', PLANS);
  if (q.max_price !== undefined) {
    if (!f.plan) throw new AppError('max_price needs a plan (hourly, monthly or yearly)');
    f.max_price = num(q.max_price, 'max_price');
  }
  if (q.min_rating !== undefined) f.min_rating = num(q.min_rating, 'min_rating', { max: 5 });
  if (q.city) f.city = String(q.city).slice(0, 80);
  if (q.search) f.search = String(q.search).slice(0, 80);
  if (q.sort) f.sort = oneOf(q.sort, 'sort', SORTS);

  const { page, limit, offset } = getPaging(q);
  const { rows, total } = await Browse.search({ ...f, limit, offset });
  res.json({ success: true, helpers: rows, ...pageMeta(total, page, limit) });
});

exports.getHelper = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError('Invalid id');
  const helper = await Browse.findOne(id);
  if (!helper) throw new AppError('Helper not found', 404);
  helper.reliability = await Stats.reliability(helper.id);
  res.json({ success: true, helper });
});
