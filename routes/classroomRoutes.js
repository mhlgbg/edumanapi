const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');

// Route lấy danh sách lớp học phần
router.get('/get-all', classroomController.getAll);
// Lấy danh sách sinh viên của lớp
router.get('/:lopHocPhanHocKiId/students', classroomController.getStudents);

// Loại sinh viên khỏi lớp
router.delete('/:lopHocPhanHocKiId/students/:maSinhVien', classroomController.removeStudent);

// Thêm sinh viên vào lớp
router.post('/:lopHocPhanHocKiId/students', classroomController.addStudents);

router.post('/:classId/schedules', classroomController.addSchedule);
router.get('/:classId/schedules', classroomController.getSchedules);
router.get('/related-classes', classroomController.getRelatedClasses);


module.exports = router;
