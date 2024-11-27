const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

router.post('/student-scores/excel', exportController.exportStudenScoreToExcel );

module.exports = router;
