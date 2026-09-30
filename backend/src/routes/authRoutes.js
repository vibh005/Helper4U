const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, c.register);
router.post('/login', authLimiter, c.login);
router.get('/me', protect, c.getMe);
router.put('/me', protect, c.updateMe);
router.put('/change-password', protect, c.changePassword);

module.exports = router;
