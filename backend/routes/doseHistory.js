const express = require('express');
const router = express.Router();
const doseHistoryController = require('../controllers/doseHistoryController');

router.get('/', doseHistoryController.getAll);
router.get('/:id', doseHistoryController.getById);
router.post('/', doseHistoryController.create);
router.put('/:id', doseHistoryController.update);
router.delete('/:id', doseHistoryController.delete);

module.exports = router; 