const fs = require('fs');
const path = require('path');
const Helper = require('../db/helperModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { UPLOAD_DIR } = require('../middleware/upload');
const Category = require('../db/categoryModel');
const { PLANS, DAYS, AVAILABILITY, DOC_TYPES } = require('../utils/constants');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const isStringArray = (v, max) =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && x.trim() && x.length <= 50);

// Validates + cleans the request body. Returns only the fields that were sent.
function cleanProfile(body, { requireServiceType }) {
  const d = {};
  if (requireServiceType && !body.service_type) throw new AppError('service_type is required');

  if (body.service_type !== undefined) {
    if (typeof body.service_type !== 'string') throw new AppError('service_type must be text');
    d.service_type = body.service_type;
  }
  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string' || body.bio.length > 1000) throw new AppError('bio must be text up to 1000 characters');
    d.bio = body.bio.trim();
  }
  if (body.experience_years !== undefined) {
    const n = Number(body.experience_years);
    if (!Number.isInteger(n) || n < 0 || n > 60) throw new AppError('experience_years must be a whole number between 0 and 60');
    d.experience_years = n;
  }
  for (const f of ['skills', 'languages']) {
    if (body[f] !== undefined) {
      if (!isStringArray(body[f], 20)) throw new AppError(`${f} must be a list of up to 20 short text values`);
      d[f] = body[f].map((x) => x.trim());
    }
  }
  if (body.available_days !== undefined) {
    if (!Array.isArray(body.available_days) || !body.available_days.every((x) => DAYS.includes(x)))
      throw new AppError(`available_days must only contain: ${DAYS.join(', ')}`);
    d.available_days = [...new Set(body.available_days)];
  }
  if (body.preferred_plans !== undefined) {
    if (!Array.isArray(body.preferred_plans) || !body.preferred_plans.every((x) => PLANS.includes(x)))
      throw new AppError(`preferred_plans must only contain: ${PLANS.join(', ')}`);
    d.preferred_plans = [...new Set(body.preferred_plans)];
  }
  for (const f of ['available_from', 'available_to']) {
    if (body[f] !== undefined) {
      if (body[f] !== null && !TIME_RE.test(body[f])) throw new AppError(`${f} must be in HH:MM format (24-hour)`);
      d[f] = body[f];
    }
  }
  if (body.availability_status !== undefined) {
    if (!AVAILABILITY.includes(body.availability_status)) throw new AppError(`availability_status must be one of: ${AVAILABILITY.join(', ')}`);
    d.availability_status = body.availability_status;
  }
  for (const f of ['hourly_rate', 'monthly_rate', 'yearly_rate']) {
    if (body[f] !== undefined) {
      if (body[f] === null) { d[f] = null; continue; }
      const n = Number(body[f]);
      if (!Number.isFinite(n) || n < 0 || n > 10000000) throw new AppError(`${f} must be a positive number`);
      d[f] = n;
    }
  }
  return d;
}

const requireProfile = async (userId) => {
  const profile = await Helper.findByUserId(userId);
  if (!profile) throw new AppError('Create your helper profile first', 404);
  return profile;
};

// GET /api/helpers/me/profile
exports.getMyProfile = asyncHandler(async (req, res) => {
  const profile = await Helper.findByUserId(req.user.id);
  const documents = profile ? await Helper.listDocuments(profile.id) : [];
  res.json({ success: true, profile: profile || null, documents });
});

// PUT /api/helpers/me/profile  (creates on first call, then partial updates)
exports.saveMyProfile = asyncHandler(async (req, res) => {
  const existing = await Helper.findByUserId(req.user.id);
  const data = cleanProfile(req.body, { requireServiceType: !existing });
  if (data.service_type && !(await Category.isActiveSlug(data.service_type))) {
    const active = (await Category.list({ activeOnly: true })).map((c) => c.slug);
    throw new AppError(`service_type must be one of: ${active.join(', ')}`);
  }
  const profile = existing ? await Helper.update(existing.id, data) : await Helper.create(req.user.id, data);
  res.status(existing ? 200 : 201).json({ success: true, profile });
});

// POST /api/helpers/me/documents   (multipart: field "document", plus doc_type)
exports.uploadDocument = asyncHandler(async (req, res) => {
  const file = req.file;
  const cleanup = () => file && fs.unlink(file.path, () => {});

  try {
    if (!file) throw new AppError('Attach a file in the "document" field');
    if (!DOC_TYPES.includes(req.body.doc_type)) throw new AppError(`doc_type must be one of: ${DOC_TYPES.join(', ')}`);
    const profile = await requireProfile(req.user.id);
    if (profile.verification_status === 'verified') throw new AppError('Your profile is already verified', 400);

    const doc = await Helper.addDocument(profile.id, {
      doc_type: req.body.doc_type,
      original_name: file.originalname.slice(0, 255),
      stored_name: file.filename,
      mime_type: file.mimetype,
      size_bytes: file.size,
    });
    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    cleanup(); // don't leave orphan files behind
    throw err;
  }
});

// GET /api/helpers/documents/:id/file  (owner or admin)
exports.downloadDocument = asyncHandler(async (req, res) => {
  const doc = await Helper.getDocument(req.params.id);
  if (!doc) throw new AppError('Document not found', 404);
  if (req.user.role !== 'admin' && doc.user_id !== req.user.id) throw new AppError('Not allowed', 403);

  const file = path.join(UPLOAD_DIR, path.basename(doc.stored_name));
  if (!fs.existsSync(file)) throw new AppError('File is missing on the server', 404);
  res.type(doc.mime_type).setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
  res.sendFile(file);
});

// DELETE /api/helpers/me/documents/:id
exports.deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Helper.getDocument(req.params.id);
  if (!doc || doc.user_id !== req.user.id) throw new AppError('Document not found', 404);
  const profile = await Helper.findByUserId(req.user.id);
  if (profile.verification_status === 'pending') throw new AppError('Documents cannot be removed while under review');
  if (doc.status === 'approved') throw new AppError('Approved documents cannot be removed');

  await Helper.deleteDocument(doc.id);
  fs.unlink(path.join(UPLOAD_DIR, path.basename(doc.stored_name)), () => {});
  res.json({ success: true, message: 'Document removed' });
});

// POST /api/helpers/me/submit-verification
exports.submitVerification = asyncHandler(async (req, res) => {
  const profile = await requireProfile(req.user.id);
  if (['pending', 'verified'].includes(profile.verification_status)) {
    throw new AppError(`Profile is already ${profile.verification_status}`);
  }
  const docs = await Helper.listDocuments(profile.id);
  if (!docs.some((d) => d.doc_type === 'identity')) {
    throw new AppError('Upload at least one identity document before submitting');
  }
  const updated = await Helper.setVerificationStatus(profile.id, 'pending');
  res.json({ success: true, message: 'Submitted for admin review', profile: updated });
});
