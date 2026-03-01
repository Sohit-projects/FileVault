const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fileController = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { success: false, message: 'Upload limit reached. Try again later.' },
});

// All file routes require authentication
router.use(protect);

router.get('/stats', fileController.getStorageStats);
router.get('/', fileController.getFiles);
// Specific routes must come before :id parameter routes
router.get('/:id/proxy', fileController.proxyFile);
router.get('/:id/download', fileController.getDownloadUrl);
router.get('/:id', fileController.getFile);

router.post('/upload', uploadLimiter, upload.array('files', 10), fileController.uploadFiles);

router.patch('/:id/rename', fileController.renameFile);
router.patch('/:id/star', fileController.toggleStar);
router.patch('/:id/trash', fileController.trashFile);
router.patch('/:id/restore', fileController.restoreFile);

router.delete('/:id', fileController.deleteFile);

module.exports = router;
