const User = require('../db/userModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

const sendAuth = (res, user, status = 200) =>
  res.status(status).json({ success: true, token: signToken(user), user });

const EMAIL_RE = /^\S+@\S+\.\S+$/;

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, city, role } = req.body;
  if (!name || !email || !password) throw new AppError('Name, email and password are required');
  if (!EMAIL_RE.test(email)) throw new AppError('Invalid email address');
  if (password.length < 8) throw new AppError('Password must be at least 8 characters');
  if (role && !['household', 'helper'].includes(role)) {
    throw new AppError('Role must be either household or helper');
  }

  const user = await User.create({ name, email, password, phone, city, role });
  await User.touchLogin(user.id);
  sendAuth(res, user, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required');

  const row = await User.findByEmailWithPassword(email);
  if (!row || !(await User.checkPassword(password, row.password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!row.is_active) throw new AppError('Your account has been deactivated', 403);

  await User.touchLogin(row.id);
  sendAuth(res, User.stripPassword(row));
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.updateProfile(req.user.id, req.body);
  res.json({ success: true, user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both passwords are required');
  if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters');

  const row = await User.findByIdWithPassword(req.user.id);
  if (!(await User.checkPassword(currentPassword, row.password))) {
    throw new AppError('Current password is incorrect', 401);
  }
  await User.updatePassword(req.user.id, newPassword);
  sendAuth(res, req.user);
});
