const router = require('express').Router();
const Category = require('../db/categoryModel');
const asyncHandler = require('../utils/asyncHandler');

// Public: active service categories (used by sign-up forms and search filters)
router.get('/', asyncHandler(async (_req, res) => {
  res.json({ success: true, categories: await Category.list({ activeOnly: true }) });
}));

module.exports = router;
