const Booking = require('../db/bookingModel');
const Review = require('../db/reviewModel');
const Browse = require('../db/browseModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');
const { getPaging, pageMeta } = require('../utils/pagination');

const toId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('Invalid id');
  return n;
};
// "Priya Sharma" -> "Priya S." (reviews are public to households)
const shortName = (n) => { const [f, ...r] = String(n).trim().split(/\s+/); return r.length ? `${f} ${r[r.length - 1][0]}.` : f; };

// POST /api/bookings/:id/review   (household who booked it, once it is completed)
exports.create = asyncHandler(async (req, res) => {
  const booking = await Booking.getById(toId(req.params.id));
  if (!booking || booking.household_id !== req.user.id) throw new AppError('Booking not found', 404);
  if (booking.status !== 'completed') throw new AppError('You can review a booking only after it is completed');
  if (await Review.findByBooking(booking.id)) throw new AppError('You have already reviewed this booking', 409);

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError('rating must be a whole number from 1 to 5');
  const { comment } = req.body;
  if (comment !== undefined && (typeof comment !== 'string' || comment.length > 1000)) throw new AppError('comment must be text up to 1000 characters');

  const review = await Review.create({
    booking_id: booking.id, household_id: req.user.id, helper_id: booking.helper_id, rating, comment: comment && comment.trim(),
  });
  await Review.recomputeHelper(booking.helper_id);
  notify(booking.helper_user_id, {
    type: 'review', title: `New ${rating}-star review`, message: comment ? comment.trim().slice(0, 120) : null, link: `/bookings/${booking.id}`,
  });
  res.status(201).json({ success: true, review });
});

// GET /api/browse/helpers/:id/reviews   (household/admin; helper must be publicly visible)
exports.listForHelper = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  if (!(await Browse.findOne(id))) throw new AppError('Helper not found', 404);
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Review.listForHelper(id, { limit, offset });
  res.json({ success: true, reviews: rows.map((r) => ({ ...r, reviewer_name: shortName(r.reviewer_name) })), ...pageMeta(total, page, limit) });
});

// DELETE /api/admin/reviews/:id   (moderation)
exports.adminRemove = asyncHandler(async (req, res) => {
  const review = await Review.findById(toId(req.params.id));
  if (!review) throw new AppError('Review not found', 404);
  await Review.remove(review.id);
  await Review.recomputeHelper(review.helper_id);
  res.json({ success: true, message: 'Review removed' });
});
