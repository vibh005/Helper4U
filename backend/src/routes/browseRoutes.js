const router = require('express').Router();
const c = require('../controllers/browseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('household', 'admin'));
router.get('/helpers', c.listHelpers);
router.get('/helpers/:id', c.getHelper);

module.exports = router;
