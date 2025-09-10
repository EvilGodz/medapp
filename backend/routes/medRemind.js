const express = require('express');
const router = express.Router();
const medRemindController = require('../controllers/medRemindController');

router.get('/', medRemindController.getAll);
router.get('/:id', medRemindController.getById);
router.post('/', medRemindController.create);
router.put('/:id', medRemindController.update);
router.delete('/:id', medRemindController.delete);

module.exports = router; 