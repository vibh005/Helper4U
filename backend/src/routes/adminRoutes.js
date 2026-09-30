const router = require('express').Router();
const c = require('../controllers/adminController');
const bookings = require('../controllers/bookingController');
const reviews = require('../controllers/reviewController');
const complaints = require('../controllers/complaintController');
const stats = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/helpers', c.listHelpers);
router.get('/helpers/:id', c.getHelper);
router.patch('/helpers/:id/verification', c.decideVerification);
router.patch('/documents/:id', c.reviewDocument);

router.get('/users', c.listUsers);
router.patch('/users/:id/status', c.setUserStatus);

router.get('/bookings', bookings.adminList);
router.get('/attendance', stats.adminAttendance);

router.get('/complaints', complaints.adminList);
router.get('/complaints/:id', complaints.adminGet);
router.patch('/complaints/:id', complaints.adminUpdate);

router.delete('/reviews/:id', reviews.adminRemove);
router.get('/analytics', stats.analytics);

router.get('/categories', c.listCategories);
router.post('/categories', c.createCategory);
router.put('/categories/:id', c.updateCategory);

module.exports = router;
