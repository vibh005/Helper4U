const Booking = require('../db/bookingModel');
const Helper = require('../db/helperModel');
const Household = require('../db/householdModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPaging, pageMeta } = require('../utils/pagination');
const { PLANS, DAYS } = require('../utils/constants');
const D = require('../utils/dates');
const notify = require('../utils/notify');

const STATUSES = ['pending', 'accepted', 'rejected', 'cancelled', 'completed'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const RATE_FIELD = { hourly: 'hourly_rate', monthly: 'monthly_rate', yearly: 'yearly_rate' };
const round2 = (n) => Math.round(n * 100) / 100;
const hhmm = (t) => String(t).slice(0, 5);

const toId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('Invalid id');
  return n;
};

function phaseOf(b) {
  const today = D.today();
  if (b.status === 'pending') return b.start_date < today ? 'expired' : 'awaiting_response';
  if (b.status === 'accepted') {
    if (today < b.start_date) return 'upcoming';
    if (today <= b.end_date) return 'ongoing';
    return 'ready_to_complete';
  }
  return b.status;
}

function shape(b, role) {
  const out = { ...b, phase: phaseOf(b) };
  const accepted = ['accepted', 'completed'].includes(b.status);
  if (role === 'household') {
    delete out.household_phone;
    if (!accepted) delete out.helper_phone;
  } else if (role === 'helper') {
    delete out.helper_phone;
    if (!accepted) {
      delete out.household_phone;
      out.address = null;
    }
  }
  delete out.helper_user_id;
  return out;
}

async function loadForUser(req) {
  const booking = await Booking.getById(toId(req.params.id));
  if (!booking) throw new AppError('Booking not found', 404);
  const isAdmin = req.user.role === 'admin';
  const isHousehold = booking.household_id === req.user.id;
  const isHelper = booking.helper_user_id === req.user.id;
  if (!isAdmin && !isHousehold && !isHelper) throw new AppError('Booking not found', 404);
  return { booking, isAdmin, isHousehold, isHelper };
}

function collides(cand, other) {
  const from = D.maxDate(cand.start_date, other.start_date);
  const to = D.minDate(cand.end_date, other.end_date);
  if (from > to) return false;
  const timeOverlap =
    D.toMinutes(cand.start_time) < D.toMinutes(other.end_time) &&
    D.toMinutes(other.start_time) < D.toMinutes(cand.end_time);
  if (!timeOverlap) return false;
  for (const day of D.eachDate(from, to)) {
    const wd = D.weekday(day);
    if (cand.schedule_days.includes(wd) && other.schedule_days.includes(wd)) return true;
  }
  return false;
}

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const helperId = toId(b.helper_id);
  if (!PLANS.includes(b.plan_type))
    throw new AppError(`plan_type must be one of: ${PLANS.join(', ')}`);
  if (!D.isValidDate(b.start_date))
    throw new AppError('start_date must be a valid date (YYYY-MM-DD)');
  for (const f of ['start_time', 'end_time']) {
    if (!TIME_RE.test(b[f] || '')) throw new AppError(`${f} must be in HH:MM format (24-hour)`);
  }
  if (b.notes !== undefined && (typeof b.notes !== 'string' || b.notes.length > 1000)) {
    throw new AppError('notes must be text up to 1000 characters');
  }

  const today = D.today();
  if (b.start_date < today) throw new AppError('start_date cannot be in the past');
  if (b.start_date > D.addDays(today, 365))
    throw new AppError('start_date cannot be more than a year ahead');

  const hours = (D.toMinutes(b.end_time) - D.toMinutes(b.start_time)) / 60;
  if (hours < 1 || hours > 14)
    throw new AppError('The daily time window must be between 1 and 14 hours');

  const helper = await Booking.getBookableHelper(helperId);
  if (!helper) throw new AppError('Helper not found or not available for booking', 404);
  if (helper.availability_status === 'unavailable')
    throw new AppError('This helper is currently not taking bookings');
  if (!helper.preferred_plans.includes(b.plan_type))
    throw new AppError(`This helper does not offer the ${b.plan_type} plan`);
  const rate = helper[RATE_FIELD[b.plan_type]];
  if (rate == null) throw new AppError(`This helper has not set a ${b.plan_type} rate`);

  let quantity, end_date, schedule_days;
  if (b.plan_type === 'hourly') {
    quantity = hours;
    end_date = b.start_date;
    schedule_days = [D.weekday(b.start_date)];
  } else {
    const key = b.plan_type === 'monthly' ? 'duration_months' : 'duration_years';
    const max = b.plan_type === 'monthly' ? 11 : 3;
    const n = b[key] === undefined ? 1 : Number(b[key]);
    if (!Number.isInteger(n) || n < 1 || n > max)
      throw new AppError(`${key} must be a whole number between 1 and ${max}`);
    quantity = n;
    end_date = D.addDays(D.addMonths(b.start_date, b.plan_type === 'monthly' ? n : n * 12), -1);

    schedule_days =
      b.schedule_days === undefined
        ? helper.available_days.length
          ? [...helper.available_days]
          : [...DAYS]
        : b.schedule_days;
    if (
      !Array.isArray(schedule_days) ||
      !schedule_days.length ||
      !schedule_days.every((d) => DAYS.includes(d))
    ) {
      throw new AppError(`schedule_days must be a non-empty list of: ${DAYS.join(', ')}`);
    }
    schedule_days = [...new Set(schedule_days)];
  }

  if (
    helper.available_days.length &&
    !schedule_days.every((d) => helper.available_days.includes(d))
  ) {
    throw new AppError(`This helper is only available on: ${helper.available_days.join(', ')}`);
  }
  if (helper.available_from && helper.available_to) {
    if (
      D.toMinutes(b.start_time) < D.toMinutes(helper.available_from) ||
      D.toMinutes(b.end_time) > D.toMinutes(helper.available_to)
    ) {
      throw new AppError(
        `This helper is only available between ${hhmm(helper.available_from)} and ${hhmm(helper.available_to)}`,
      );
    }
  }

  const cand = {
    start_date: b.start_date,
    end_date,
    start_time: b.start_time,
    end_time: b.end_time,
    schedule_days,
  };
  const busy = await Booking.acceptedOverlapping(helperId, b.start_date, end_date);
  if (busy.some((o) => collides(cand, o)))
    throw new AppError('This helper is already booked for that time', 409);

  let address = b.address;
  if (address === undefined) address = (await Household.findByUserId(req.user.id))?.address;
  if (!address || typeof address !== 'string' || !address.trim() || address.length > 255) {
    throw new AppError('Provide a service address, or add one to your household profile');
  }

  const id = await Booking.create({
    household_id: req.user.id,
    helper_id: helperId,
    plan_type: b.plan_type,
    start_date: b.start_date,
    end_date,
    start_time: b.start_time,
    end_time: b.end_time,
    schedule_days,
    quantity,
    rate,
    total_price: round2(rate * quantity),
    address: address.trim(),
    notes: b.notes,
  });
  const booking = await Booking.getById(id);
  notify(booking.helper_user_id, {
    type: 'booking',
    title: 'New booking request',
    message: `${booking.household_name} wants a ${b.plan_type} booking from ${b.start_date}`,
    link: `/bookings/${id}`,
  });
  res.status(201).json({ success: true, booking: shape(booking, 'household') });
});

exports.listMine = asyncHandler(async (req, res) => {
  const { status, plan_type } = req.query;
  if (status && !STATUSES.includes(status))
    throw new AppError(`status must be one of: ${STATUSES.join(', ')}`);
  if (plan_type && !PLANS.includes(plan_type))
    throw new AppError(`plan_type must be one of: ${PLANS.join(', ')}`);
  const { page, limit, offset } = getPaging(req.query);

  const scope = {};
  if (req.user.role === 'household') scope.household_id = req.user.id;
  else {
    const profile = await Helper.findByUserId(req.user.id);
    if (!profile) return res.json({ success: true, bookings: [], ...pageMeta(0, page, limit) });
    scope.helper_id = profile.id;
  }
  const { rows, total } = await Booking.list({ ...scope, status, plan_type, limit, offset });
  res.json({
    success: true,
    bookings: rows.map((r) => shape(r, req.user.role)),
    ...pageMeta(total, page, limit),
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const { booking, isAdmin, isHousehold } = await loadForUser(req);
  res.json({
    success: true,
    booking: shape(booking, isAdmin ? 'admin' : isHousehold ? 'household' : 'helper'),
  });
});

exports.respond = asyncHandler(async (req, res) => {
  const { booking, isHelper } = await loadForUser(req);
  if (!isHelper || req.user.role !== 'helper')
    throw new AppError('Only the assigned helper can respond', 403);
  const { decision, reason } = req.body;
  if (!['accept', 'reject'].includes(decision))
    throw new AppError('decision must be accept or reject');
  if (booking.status !== 'pending') throw new AppError(`This request is already ${booking.status}`);

  if (decision === 'reject') {
    await Booking.respond(booking.id, 'rejected', reason && String(reason).slice(0, 500));
  } else {
    if (booking.start_date < D.today())
      throw new AppError('This request has expired: its start date has passed');

    await Booking.withTransaction(async (client) => {
      await Booking.lockHelper(client, booking.helper_id);
      const others = await Booking.acceptedOverlapping(
        booking.helper_id,
        booking.start_date,
        booking.end_date,
        booking.id,
        client.query.bind(client),
      );
      if (others.some((o) => collides(booking, o)))
        throw new AppError('You already have an accepted booking at that time', 409);
      if (!(await Booking.respond(booking.id, 'accepted', null, client.query.bind(client)))) {
        throw new AppError('This request is no longer pending');
      }
    });
  }
  notify(booking.household_id, {
    type: 'booking',
    title: decision === 'accept' ? 'Booking accepted' : 'Booking declined',
    message:
      decision === 'accept'
        ? `${booking.helper_name} accepted your request`
        : reason
          ? String(reason).slice(0, 120)
          : `${booking.helper_name} could not take this booking`,
    link: `/bookings/${booking.id}`,
  });
  res.json({ success: true, booking: shape(await Booking.getById(booking.id), 'helper') });
});

exports.cancel = asyncHandler(async (req, res) => {
  const { booking, isAdmin, isHousehold } = await loadForUser(req);
  const reason = req.body.reason && String(req.body.reason).trim().slice(0, 500);
  if (booking.status === 'accepted' && !reason)
    throw new AppError('Please give a reason for cancelling an accepted booking');
  if (!['pending', 'accepted'].includes(booking.status))
    throw new AppError(`A ${booking.status} booking cannot be cancelled`);

  const by = isAdmin ? 'admin' : isHousehold ? 'household' : 'helper';
  if (!(await Booking.cancel(booking.id, by, reason)))
    throw new AppError('This booking can no longer be cancelled');
  const msg = {
    type: 'booking',
    title: 'Booking cancelled',
    message: reason || null,
    link: `/bookings/${booking.id}`,
  };
  if (by !== 'household') notify(booking.household_id, msg);
  if (by !== 'helper') notify(booking.helper_user_id, msg);
  res.json({ success: true, booking: shape(await Booking.getById(booking.id), by) });
});

exports.complete = asyncHandler(async (req, res) => {
  const { booking, isAdmin, isHousehold } = await loadForUser(req);
  if (isAdmin)
    throw new AppError('Only the household or the helper can mark a booking complete', 403);
  if (booking.status !== 'accepted') throw new AppError('Only accepted bookings can be completed');
  if (D.today() < booking.end_date)
    throw new AppError(`The service period ends on ${booking.end_date}; you can complete it then`);
  if (!(await Booking.complete(booking.id)))
    throw new AppError('This booking can no longer be completed');
  notify(isHousehold ? booking.helper_user_id : booking.household_id, {
    type: 'booking',
    title: 'Booking marked complete',
    message: isHousehold
      ? 'You can now expect your earnings to update'
      : 'Please leave a review for your helper',
    link: `/bookings/${booking.id}`,
  });
  res.json({
    success: true,
    booking: shape(await Booking.getById(booking.id), isHousehold ? 'household' : 'helper'),
  });
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const { booking, isHelper } = await loadForUser(req);
  if (!isHelper || req.user.role !== 'helper')
    throw new AppError('Only the assigned helper can mark attendance', 403);
  const { date, status, note } = req.body;
  if (!D.isValidDate(date)) throw new AppError('date must be a valid date (YYYY-MM-DD)');
  if (!['present', 'absent'].includes(status))
    throw new AppError('status must be present or absent');
  if (note !== undefined && (typeof note !== 'string' || note.length > 255))
    throw new AppError('note must be text up to 255 characters');
  if (booking.status !== 'accepted')
    throw new AppError('Attendance can only be marked on accepted bookings');
  if (date < booking.start_date || date > booking.end_date)
    throw new AppError('That date is outside the booking period');
  if (date > D.today()) throw new AppError('Attendance cannot be marked for a future date');
  if (!booking.schedule_days.includes(D.weekday(date)))
    throw new AppError('That day is not part of the booking schedule');

  res.status(201).json({
    success: true,
    attendance: await Booking.markAttendance(booking.id, date, status, note),
  });
});

exports.listAttendance = asyncHandler(async (req, res) => {
  const { booking } = await loadForUser(req);
  const records = await Booking.listAttendance(booking.id);
  const present = records.filter((r) => r.status === 'present').length;
  res.json({
    success: true,
    attendance: records,
    summary: { present, absent: records.length - present },
  });
});

exports.adminList = asyncHandler(async (req, res) => {
  const { status, plan_type, from, to } = req.query;
  if (status && !STATUSES.includes(status))
    throw new AppError(`status must be one of: ${STATUSES.join(', ')}`);
  if (plan_type && !PLANS.includes(plan_type))
    throw new AppError(`plan_type must be one of: ${PLANS.join(', ')}`);
  for (const [k, v] of [
    ['from', from],
    ['to', to],
  ])
    if (v && !D.isValidDate(v)) throw new AppError(`${k} must be a valid date (YYYY-MM-DD)`);
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Booking.list({
    status,
    plan_type,
    from,
    to,
    limit,
    offset,
    helper_id: req.query.helper_id ? toId(req.query.helper_id) : undefined,
    household_id: req.query.household_id ? toId(req.query.household_id) : undefined,
  });
  res.json({
    success: true,
    bookings: rows.map((r) => shape(r, 'admin')),
    ...pageMeta(total, page, limit),
  });
});
