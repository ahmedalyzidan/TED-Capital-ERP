const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { upload } = require('../config/storage');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/upload/:table/:id', upload.single('file'), fileController.uploadFile);
router.get('/attachments/:table/:id', fileController.getAttachments);
router.delete('/delete_attachment/:id', fileController.deleteAttachment);

module.exports = router;
