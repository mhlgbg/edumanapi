const express = require('express');
const router = express.Router();
const trainingPlanController = require('../controllers/trainingPlanController');
router.get('/', trainingPlanController.getTrainingPlans);

// Thêm mới kế hoạch đào tạo
router.post('/', trainingPlanController.addTrainingPlan);

// Thêm lớp vào môn học
router.post('/add-class', trainingPlanController.addClassToSubject);

// Xóa kế hoạch đào tạo (lớp)
router.delete('/:id', trainingPlanController.deleteTrainingPlan);

// Xóa toàn bộ môn học và lớp liên quan
router.delete('/subject/:MaHocPhan', trainingPlanController.deleteSubject);

// API tìm kiếm học phần
router.get('/hocphan/all', trainingPlanController.getAllHocPhan);

// API tìm kiếm lớp chuyên ngành
router.get('/lop/all', trainingPlanController.getAllLopChuyenNganh);

module.exports = router;
