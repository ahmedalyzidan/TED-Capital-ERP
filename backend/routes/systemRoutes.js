const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { requireAdmin } = require('../middlewares/auth');

// 1. Configuration & Monitoring
router.get('/dropdowns', systemController.getDropdowns);

// 2. Data Lifecycle Management
router.get('/backups', requireAdmin, systemController.getBackups);
router.post('/backup/manual', requireAdmin, systemController.manualBackup);
router.post('/backups/manual', requireAdmin, systemController.manualBackup); // Alias for plural call from frontend
router.post('/backup/restore', requireAdmin, systemController.restoreBackup);
router.post('/backups/restore', requireAdmin, systemController.restoreBackup); // Alias for plural call from frontend
router.post('/backup/recover', requireAdmin, systemController.recoverBackups); // New: Manual Recovery
router.post('/factory-reset', requireAdmin, systemController.factoryReset);
router.get('/purgeable-tables', requireAdmin, systemController.getPurgeableTables);

// 3. User Experience & Sync
router.get('/notifications', systemController.getNotifications);
router.put('/notifications/:id/read', systemController.markNotificationRead);

// 4. Elite Authorization & Workflows
router.get('/authorizations/pending', systemController.getPendingAuthorizations);
router.post('/authorizations/authorize', systemController.authorizeRecord);
router.get('/authorizations/workflows', requireAdmin, systemController.getWorkflowDefinitions);
router.put('/authorizations/workflows/:id', requireAdmin, systemController.updateWorkflowDefinition);
router.get('/audit/logs', systemController.getRecordAuditLogs);

// 5. Proactive Intelligence
router.post('/intelligence/run', requireAdmin, systemController.runIntelligenceDiagnostics);

// 6. Smart UI Data
router.get('/sidebar-stats', systemController.getSidebarStats);

module.exports = router;