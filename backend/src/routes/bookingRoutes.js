const router = require('express').Router();
const c = require('../controllers/bookingController');
const reviews = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', authorize('household'), c.create);
router.get('/', authorize('household', 'helper'), c.listMine);

router.get('/:id', c.getOne);
router.patch('/:id/cancel', c.cancel);
router.get('/:id/attendance', c.listAttendance);

router.patch('/:id/respond', authorize('helper'), c.respond);
router.post('/:id/complete', authorize('household', 'helper'), c.complete);
router.post('/:id/attendance', authorize('helper'), c.markAttendance);
router.post('/:id/review', authorize('household'), reviews.create);

module.exports = router;
