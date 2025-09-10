const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendVerificationEmail } = require('../services/emailService');

// สมัครสมาชิก (พร้อม Email Verification)
const signup = async (req, res) => {
  try {
    const { fullname, email, password, birth_date, weight, height } = req.body;
    
    console.log('📝 Signup request:', { fullname, email, birth_date, weight, height });
    
    // ตรวจสอบว่าข้อมูลครบถ้วน
    if (!fullname || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }
    
    // ตรวจสอบว่า email มีอยู่แล้วหรือไม่
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('❌ Email already exists');
      return res.status(400).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว'
      });
    }
    
    // สร้าง verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ชั่วโมง
    
    // สร้างผู้ใช้ใหม่ (ไม่ verified)
    console.log('✅ Creating new user with verification...');
    const newUser = await User.createWithVerification({
      fullname,
      email,
      password,
      birth_date,
      weight,
      height,
      verificationToken,
      verificationExpires
    });
    
    console.log('✅ User created successfully:', newUser.id);
    
    // ส่งอีเมลยืนยัน
    console.log('📧 Sending verification email...');
    const emailResult = await sendVerificationEmail(email, fullname, verificationToken);
    
    if (emailResult.success) {
      console.log('✅ Email sent successfully');
      res.status(201).json({
        success: true,
        message: 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี',
        data: {
          user: {
            id: newUser.id,
            fullname: newUser.fullname,
            email: newUser.email,
            email_verified: false
          },
          emailSent: true
        }
      });
    } else {
      console.log('❌ Email sending failed, removing user');
      // ถ้าส่งอีเมลไม่สำเร็จ ให้ลบผู้ใช้ที่สร้างไว้
      await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
      
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองใหม่'
      });
    }
    
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + error.message
    });
  }
};

// ยืนยันอีเมล
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Verifying email with token:', token);
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ token สำหรับยืนยัน'
      });
    }
    
    // ค้นหาผู้ใช้จาก verification token
    const query = `
      SELECT * FROM users 
      WHERE verification_token = $1 
      AND verification_token_expires > NOW()
      AND email_verified = FALSE
    `;
    
    const result = await pool.query(query, [token]);
    
    if (result.rows.length === 0) {
      console.log('❌ Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว'
      });
    }
    
    const user = result.rows[0];
    console.log('✅ Found user for verification:', user.email);
    
    // อัปเดตสถานะการยืนยัน
    const updateQuery = `
      UPDATE users 
      SET email_verified = TRUE, 
          verification_token = NULL, 
          verification_token_expires = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, fullname, email, email_verified, created_at
    `;
    
    const updateResult = await pool.query(updateQuery, [user.id]);
    const verifiedUser = updateResult.rows[0];
    
    console.log('✅ Email verified successfully for user:', verifiedUser.email);
    
    // ส่งหน้าสำเร็จ (HTML Response)
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ยืนยันอีเมลสำเร็จ</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background-color: #f5f5f5; 
          }
          .container { 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            max-width: 500px; 
            margin: 0 auto; 
          }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 30px; }
          .button { 
            background: #28a745; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅ ยืนยันอีเมลสำเร็จ!</div>
          <div class="message">
            ยินดีต้อนรับ ${verifiedUser.fullname}!<br>
            คุณสามารถเข้าสู่ระบบได้แล้ว
          </div>
          <a href="exp://192.168.1.89:8081" class="button">เปิดแอป</a>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยันอีเมล'
    });
  }
};

// เข้าสู่ระบบ (ตรวจสอบ email verification)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลและรหัสผ่าน'
      });
    }
    
    // ค้นหาผู้ใช้
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }
    
    // ตรวจสอบการยืนยันอีเมล
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
        emailVerified: false,
        email: user.email
      });
    }
    
    // ตรวจสอบรหัสผ่าน
    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }
    
    // สร้าง JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );
    
    // ส่งข้อมูลผู้ใช้ (ไม่รวมรหัสผ่าน)
    const { password: userPassword, verification_token, ...userData } = user;
    
    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        user: userData,
        token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
};

// ดึงข้อมูลผู้ใช้
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
    });
  }
};

// ส่งอีเมลยืนยันใหม่
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุอีเมล'
      });
    }
    
    // ค้นหาผู้ใช้
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่มีอีเมลนี้'
      });
    }
    
    // ตรวจสอบว่า email ยังไม่ verified
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลนี้ได้รับการยืนยันแล้ว'
      });
    }
    
    // สร้าง verification token ใหม่
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ชั่วโมง
    
    // อัปเดต token ใหม่ในฐานข้อมูล
    const updateQuery = `
      UPDATE users 
      SET verification_token = $1, 
          verification_token_expires = $2,
          updated_at = NOW()
      WHERE id = $3
    `;
    
    await pool.query(updateQuery, [verificationToken, verificationExpires, user.id]);
    
    // ส่งอีเมลยืนยันใหม่
    const emailResult = await sendVerificationEmail(email, user.fullname, verificationToken);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: 'ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่'
      });
    }
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน'
    });
  }
};

// Export ฟังก์ชันทั้งหมด
module.exports = {
  signup,
  login,
  getProfile,
  verifyEmail,
  resendVerification
};