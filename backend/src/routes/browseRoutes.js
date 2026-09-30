const router = require('express').Router();
const c = require('../controllers/browseController');
const reviews = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('household', 'admin'));
router.get('/helpers', c.listHelpers);
router.get('/helpers/:id', c.getHelper);
router.get('/helpers/:id/reviews', reviews.listForHelper);

module.exports = router;
