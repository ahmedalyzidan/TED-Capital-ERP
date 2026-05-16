const express = require('express');
const router = express.Router();
const { authGuard } = require('../middlewares/authMiddleware');
const preferenceController = require('../controllers/preferenceController');

// ⚙️ User Preferences & Theming
router.get('/preferences', authGuard, preferenceController.getPreferences);
router.post('/preferences', authGuard, preferenceController.updatePreferences);

// 🏢 Tenant & White-labeling
router.get('/tenant-settings', preferenceController.getTenantSettings);

module.exports = router;
