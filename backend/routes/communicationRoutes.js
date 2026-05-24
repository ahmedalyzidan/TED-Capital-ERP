const express = require('express');
const router = express.Router();
const CommunicationController = require('../controllers/communicationController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

// --- templates ---
router.post('/templates', CommunicationController.createTemplate);
router.get('/templates', CommunicationController.getTemplates);

// --- campaigns ---
router.post('/campaigns', CommunicationController.createCampaign);
router.get('/campaigns', CommunicationController.getCampaigns);
router.post('/campaigns/:id/launch', CommunicationController.launchCampaign);

// --- logs ---
router.get('/logs', CommunicationController.getLogs);

// --- inventory integration ---
router.post('/promote/:inventory_id', CommunicationController.promoteInventoryItem);

module.exports = router;
