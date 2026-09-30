const Household = require('../db/householdModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function cleanHousehold(b) {
  const d = {};
  if (b.address !== undefined) {
    if (typeof b.address !== 'string' || b.address.length > 255) throw new AppError('address must be text up to 255 characters');
    d.address = b.address.trim();
  }
  if (b.pincode !== undefined) {
    if (b.pincode !== null && !/^\d{6}$/.test(String(b.pincode))) throw new AppError('pincode must be 6 digits');
    d.pincode = b.pincode === null ? null : String(b.pincode);
  }
  if (b.family_size !== undefined) {
    const n = Number(b.family_size);
    if (!Number.isInteger(n) || n < 1 || n > 30) throw new AppError('family_size must be a whole number between 1 and 30');
    d.family_size = n;
  }
  if (b.children_count !== undefined) {
    const n = Number(b.children_count);
    if (!Number.isInteger(n) || n < 0 || n > 20) throw new AppError('children_count must be a whole number between 0 and 20');
    d.children_count = n;
  }
  if (b.has_pets !== undefined) {
    if (typeof b.has_pets !== 'boolean') throw new AppError('has_pets must be true or false');
    d.has_pets = b.has_pets;
  }
  if (b.notes !== undefined) {
    if (typeof b.notes !== 'string' || b.notes.length > 1000) throw new AppError('notes must be text up to 1000 characters');
    d.notes = b.notes.trim();
  }
  return d;
}

// GET /api/households/me/profile
exports.getMyProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, profile: (await Household.findByUserId(req.user.id)) || null });
});

// PUT /api/households/me/profile  (creates on first call, then partial updates)
exports.saveMyProfile = asyncHandler(async (req, res) => {
  const data = cleanHousehold(req.body);
  const existing = await Household.findByUserId(req.user.id);
  const profile = existing ? await Household.update(existing.id, data) : await Household.create(req.user.id, data);
  res.status(existing ? 200 : 201).json({ success: true, profile });
});
