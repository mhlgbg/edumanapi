const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

router.get('/gio-hoc', scheduleController.getGioHoc);
router.get('/phong-hoc', scheduleController.getPhongHoc);
router.get('/nhan-su', scheduleController.getNhanSu);
router.put('/:scheduleId', scheduleController.updateSchedule);
router.delete('/:scheduleId', scheduleController.deleteSchedule);
router.get('/by-teachers', scheduleController.getScheduleByTeacher);

router.get('/by-semester', scheduleController.getScheduleByHocKi);
module.exports = router;
