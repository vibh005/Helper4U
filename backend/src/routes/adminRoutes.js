const router = require('express').Router();
const c = require('../controllers/adminController');
const bookings = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/helpers', c.listHelpers);
router.get('/helpers/:id', c.getHelper);
router.patch('/helpers/:id/verification', c.decideVerification);
router.patch('/documents/:id', c.reviewDocument);

router.get('/users', c.listUsers);
router.patch('/users/:id/status', c.setUserStatus);

router.get('/bookings', bookings.adminList);

router.get('/categories', c.listCategories);
router.post('/categories', c.createCategory);
router.put('/categories/:id', c.updateCategory);

module.exports = router;
