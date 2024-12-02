const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');


router.get('/:semesterId/semester-detail', semesterController.getSemesterDetails);

router.get('/', semesterController.getSemesters);

module.exports = router;
