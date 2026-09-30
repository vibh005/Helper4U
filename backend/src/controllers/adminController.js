const Admin = require('../db/adminModel');
const Category = require('../db/categoryModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPaging, pageMeta } = require('../utils/pagination');

const VERIFICATION = ['unverified', 'pending', 'verified', 'rejected'];
const ROLES = ['household', 'helper', 'admin'];

const toId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('Invalid id', 400);
  return n;
};

// ---------- helper verification ----------

// GET /api/admin/helpers?status=pending&service_type=maid&search=asha&page=1&limit=20
exports.listHelpers = asyncHandler(async (req, res) => {
  const { status, service_type, search } = req.query;
  if (status && !VERIFICATION.includes(status)) throw new AppError(`status must be one of: ${VERIFICATION.join(', ')}`);
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Admin.listHelpers({ status, service_type, search, limit, offset });
  res.json({ success: true, helpers: rows, ...pageMeta(total, page, limit) });
});

// GET /api/admin/helpers/:id
exports.getHelper = asyncHandler(async (req, res) => {
  const helper = await Admin.getHelperDetail(toId(req.params.id));
  if (!helper) throw new AppError('Helper not found', 404);
  res.json({ success: true, helper });
});

// PATCH /api/admin/documents/:id   { status: 'approved' | 'rejected' }
exports.reviewDocument = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) throw new AppError('status must be approved or rejected');
  const doc = await Admin.setDocumentStatus(toId(req.params.id), status);
  if (!doc) throw new AppError('Document not found', 404);
  res.json({ success: true, document: doc });
});

// PATCH /api/admin/helpers/:id/verification   { decision: 'approve' | 'reject', note }
exports.decideVerification = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const { decision, note } = req.body;
  if (!['approve', 'reject'].includes(decision)) throw new AppError('decision must be approve or reject');

  const profile = await Admin.getProfile(id);
  if (!profile) throw new AppError('Helper not found', 404);
  if (profile.verification_status !== 'pending') {
    throw new AppError(`Only pending profiles can be reviewed (this one is ${profile.verification_status})`);
  }

  if (decision === 'approve') {
    if (!(await Admin.hasApprovedIdentity(id))) {
      throw new AppError('Approve at least one identity document before verifying this helper');
    }
    const updated = await Admin.decideVerification(id, 'verified', note);
    return res.json({ success: true, message: 'Helper verified', profile: updated });
  }

  if (!note || !note.trim()) throw new AppError('A note explaining the rejection is required');
  const updated = await Admin.decideVerification(id, 'rejected', note.trim());
  res.json({ success: true, message: 'Helper rejected', profile: updated });
});

// ---------- users ----------

// GET /api/admin/users?role=&active=true&search=&page=&limit=
exports.listUsers = asyncHandler(async (req, res) => {
  const { role, active, search } = req.query;
  if (role && !ROLES.includes(role)) throw new AppError(`role must be one of: ${ROLES.join(', ')}`);
  if (active !== undefined && !['true', 'false'].includes(active)) throw new AppError('active must be true or false');
  const { page, limit, offset } = getPaging(req.query);
  const { rows, total } = await Admin.listUsers({
    role, search, limit, offset, active: active === undefined ? undefined : active === 'true',
  });
  res.json({ success: true, users: rows, ...pageMeta(total, page, limit) });
});

// PATCH /api/admin/users/:id/status   { is_active: true | false }
exports.setUserStatus = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  if (typeof req.body.is_active !== 'boolean') throw new AppError('is_active must be true or false');
  if (id === req.user.id) throw new AppError('You cannot change your own status');
  const target = await Admin.findUser(id);
  if (!target) throw new AppError('User not found', 404);
  if (target.role === 'admin') throw new AppError('Admin accounts cannot be deactivated here', 403);
  const user = await Admin.setUserActive(id, req.body.is_active);
  res.json({ success: true, user });
});

// ---------- service categories ----------

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);

// GET /api/admin/categories   (includes inactive)
exports.listCategories = asyncHandler(async (_req, res) => {
  res.json({ success: true, categories: await Category.list() });
});

// POST /api/admin/categories   { name, description? }
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim() || name.length > 60) throw new AppError('name is required (max 60 characters)');
  const slug = slugify(name);
  if (!slug) throw new AppError('name must contain letters or numbers');
  const category = await Category.create({ slug, name: name.trim(), description });
  res.status(201).json({ success: true, category });
});

// PUT /api/admin/categories/:id   { name?, description?, is_active? }  (slug never changes)
exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, description, is_active } = req.body;
  if (name !== undefined && (!name.trim() || name.length > 60)) throw new AppError('name must be 1-60 characters');
  if (is_active !== undefined && typeof is_active !== 'boolean') throw new AppError('is_active must be true or false');
  const category = await Category.update(toId(req.params.id), {
    name: name && name.trim(), description, is_active,
  });
  if (!category) throw new AppError('Category not found', 404);
  res.json({ success: true, category });
});
