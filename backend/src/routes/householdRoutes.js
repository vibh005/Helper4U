const router = require('express').Router();
const c = require('../controllers/householdController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('household'));
router.get('/me/profile', c.getMyProfile);
router.put('/me/profile', c.saveMyProfile);

module.exports = router;
