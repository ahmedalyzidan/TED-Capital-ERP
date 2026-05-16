const express = require('express');
const router = express.Router();
const dynamicController = require('../controllers/dynamicController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/table/:type', dynamicController.getTable);
router.post('/add/:type', dynamicController.addRecord);
router.put('/update/:type/:id', dynamicController.updateRecord);
router.delete('/delete/:type/:id', dynamicController.deleteRecord);

module.exports = router;
