const express = require('express');
const router = express.Router();

// Import functions from controller
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// Extract functions
const { signup, login, getProfile, verifyEmail } = authController;

// ตรวจสอบว่าฟังก์ชันมีอยู่จริง
console.log('Available functions:', Object.keys(authController));

// สมัครสมาชิก (ส่งอีเมลยืนยัน)
router.post('/signup', signup);

// เข้าสู่ระบบ (ตรวจสอบ email verification)
router.post('/login', login);

// ดึงข้อมูลผู้ใช้ (ต้องมี token)
router.get('/profile', authenticateToken, getProfile);

// ยืนยันอีเมล (ไม่ต้อง authentication)
router.get('/verify-email/:token', verifyEmail);

module.exports = router;