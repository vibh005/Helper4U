const router = require('express').Router();
const c = require('../controllers/helperController');
const { protect, authorize } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');

router.use(protect);

// Helper-only
router.get('/me/profile', authorize('helper'), c.getMyProfile);
router.put('/me/profile', authorize('helper'), c.saveMyProfile);
router.post('/me/documents', authorize('helper'), uploadDocument, c.uploadDocument);
router.delete('/me/documents/:id', authorize('helper'), c.deleteDocument);
router.post('/me/submit-verification', authorize('helper'), c.submitVerification);

// Owner (helper) or admin - checked inside the controller
router.get('/documents/:id/file', authorize('helper', 'admin'), c.downloadDocument);

module.exports = router;
