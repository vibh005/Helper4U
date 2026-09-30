const Helper = require('../db/helperModel');
const Stats = require('../db/statsModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPaging, pageMeta } = require('../utils/pagination');
const { isValidDate } = require('../utils/dates');

const need = async (userId) => {
  const profile = await Helper.findByUserId(userId);
  if (!profile) throw new AppError('Create your helper profile first', 404);
  return profile;
};

// GET /api/helpers/me/earnings   (view-only in Phase 1)
exports.myEarnings = asyncHandler(async (req, res) => {
  const profile = await need(req.user.id);
  res.json({ success: true, earnings: await Stats.earnings(profile.id) });
});

// GET /api/helpers/me/stats
exports.myStats = asyncHandler(async (req, res) => {
  const profile = await need(req.user.id);
  res.json({
    success: true,
    stats: {
      rating: { average: profile.avg_rating, reviews: profile.review_count },
      reliability: await Stats.reliability(profile.id),
      verification_status: profile.verification_status,
    },
  });
});

// GET /api/admin/analytics
exports.analytics = asyncHandler(async (_req, res) => {
  res.json({ success: true, analytics: await Stats.analytics() });
});

// GET /api/admin/attendance?status=absent&from=&to=
exports.adminAttendance = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  if (status && !['present', 'absent'].includes(status)) throw new AppError('status must be present or absent');
  for (const [k, v] of [['from', from], ['to', to]]) if (v && !isValidDate(v)) throw new AppError(`${k} must be a valid date (YYYY-MM-DD)`);
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Stats.listAttendance({ status, from, to, limit, offset });
  res.json({ success: true, attendance: rows, ...pageMeta(total, page, limit) });
});
