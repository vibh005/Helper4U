const Notification = require('../db/notificationModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPaging, pageMeta } = require('../utils/pagination');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Notification.list(req.user.id, {
    unreadOnly: req.query.unread === 'true',
    limit,
    offset,
  });
  res.json({
    success: true,
    notifications: rows,
    unread_count: await Notification.unreadCount(req.user.id),
    ...pageMeta(total, page, limit),
  });
});

exports.markRead = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError('Invalid id');
  if (!(await Notification.markRead(id, req.user.id)))
    throw new AppError('Notification not found', 404);
  res.json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.markAllRead(req.user.id);
  res.json({ success: true });
});
