const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload'); // Cấu hình upload


const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');


const router = express.Router();


router.post('/login', userController.login);
router.post('/change-password', authenticateToken, userController.changePassword);
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.put('/upload-avatar', authenticateToken, upload.single('avatar'), userController.uploadAvatar);

module.exports = router;
