const Booking = require('../db/bookingModel');
const Complaint = require('../db/complaintModel');
const User = require('../db/userModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');
const { getPaging, pageMeta } = require('../utils/pagination');

const CATEGORIES = ['no_show', 'misconduct', 'payment', 'quality', 'other'];
const STATUSES = ['open', 'in_review', 'resolved', 'dismissed'];

const toId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('Invalid id');
  return n;
};

// POST /api/complaints   { booking_id, category, description }   (household or helper on that booking)
exports.create = asyncHandler(async (req, res) => {
  const { category, description } = req.body;
  if (!CATEGORIES.includes(category)) throw new AppError(`category must be one of: ${CATEGORIES.join(', ')}`);
  if (typeof description !== 'string' || description.trim().length < 10 || description.length > 2000) {
    throw new AppError('Please describe the problem in 10 to 2000 characters');
  }
  const booking = await Booking.getById(toId(req.body.booking_id));
  const isHousehold = booking && booking.household_id === req.user.id;
  const isHelper = booking && booking.helper_user_id === req.user.id;
  if (!isHousehold && !isHelper) throw new AppError('Booking not found', 404);
  if (!['accepted', 'completed', 'cancelled'].includes(booking.status)) {
    throw new AppError('Complaints can only be raised on accepted, completed or cancelled bookings');
  }

  const id = await Complaint.create({
    booking_id: booking.id, complainant_id: req.user.id,
    against_id: isHousehold ? booking.helper_user_id : booking.household_id,
    category, description: description.trim(),
  });
  for (const adminId of await User.adminIds()) {
    notify(adminId, { type: 'complaint', title: 'New complaint filed', message: `${category.replace('_', ' ')} - booking #${booking.id}`, link: `/admin/complaints` });
  }
  res.status(201).json({ success: true, complaint: await Complaint.findById(id) });
});

// GET /api/complaints   (complaints I filed)
exports.listMine = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Complaint.list({ complainant_id: req.user.id, limit, offset });
  res.json({ success: true, complaints: rows, ...pageMeta(total, page, limit) });
});

// ---- admin ----

// GET /api/admin/complaints?status=&category=
exports.adminList = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  if (status && !STATUSES.includes(status)) throw new AppError(`status must be one of: ${STATUSES.join(', ')}`);
  if (category && !CATEGORIES.includes(category)) throw new AppError(`category must be one of: ${CATEGORIES.join(', ')}`);
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Complaint.list({ status, category, limit, offset });
  res.json({ success: true, complaints: rows, ...pageMeta(total, page, limit) });
});

// GET /api/admin/complaints/:id
exports.adminGet = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(toId(req.params.id));
  if (!complaint) throw new AppError('Complaint not found', 404);
  res.json({ success: true, complaint });
});

// PATCH /api/admin/complaints/:id   { status, resolution_note }
exports.adminUpdate = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(toId(req.params.id));
  if (!complaint) throw new AppError('Complaint not found', 404);
  const { status, resolution_note } = req.body;
  if (!STATUSES.includes(status)) throw new AppError(`status must be one of: ${STATUSES.join(', ')}`);
  if (resolution_note !== undefined && (typeof resolution_note !== 'string' || resolution_note.length > 2000)) {
    throw new AppError('resolution_note must be text up to 2000 characters');
  }
  if (['resolved', 'dismissed'].includes(status) && !(resolution_note && resolution_note.trim()) && !complaint.resolution_note) {
    throw new AppError('Add a resolution note when resolving or dismissing a complaint');
  }
  await Complaint.resolve(complaint.id, { status, resolution_note: resolution_note && resolution_note.trim() }, req.user.id);
  notify(complaint.complainant_id, {
    type: 'complaint', title: `Your complaint is ${status.replace('_', ' ')}`,
    message: resolution_note ? resolution_note.trim().slice(0, 200) : null, link: '/complaints',
  });
  res.json({ success: true, complaint: await Complaint.findById(complaint.id) });
});
