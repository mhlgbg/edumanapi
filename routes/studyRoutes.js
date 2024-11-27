const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');

// Route lấy danh sách Khoa Hệ
router.get('/khoahe', studyController.getKhoaHe);

// Route lấy danh sách Ngành theo Khoa Hệ
router.get('/nganh', studyController.getNganh);

// Route lấy danh sách Lớp chuyên ngành theo Ngành
router.get('/lopchuyennganh', studyController.getLopChuyenNganh);

// Route lấy danh sách Sinh Viên với các bộ lọc
router.get('/sinhvien', studyController.getSinhVien);
router.get('/diemtongket/:maSinhVien', studyController.getStudentScores);

module.exports = router;
