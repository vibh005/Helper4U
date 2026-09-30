const router = require('express').Router();
const c = require('../controllers/helperController');
const stats = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');

router.use(protect);

router.get('/me/profile', authorize('helper'), c.getMyProfile);
router.put('/me/profile', authorize('helper'), c.saveMyProfile);
router.post('/me/documents', authorize('helper'), uploadDocument, c.uploadDocument);
router.delete('/me/documents/:id', authorize('helper'), c.deleteDocument);
router.get('/me/earnings', authorize('helper'), stats.myEarnings);
router.get('/me/stats', authorize('helper'), stats.myStats);
router.post('/me/submit-verification', authorize('helper'), c.submitVerification);

router.get('/documents/:id/file', authorize('helper', 'admin'), c.downloadDocument);

module.exports = router;
