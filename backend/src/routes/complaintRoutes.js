const router = require('express').Router();
const c = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('household', 'helper'));
router.post('/', c.create);
router.get('/', c.listMine);

module.exports = router;
