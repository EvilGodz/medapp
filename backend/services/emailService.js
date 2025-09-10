const nodemailer = require('nodemailer');
require('dotenv').config();

// สร้าง transporter สำหรับส่งอีเมล
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// ส่งอีเมลยืนยัน
const sendVerificationEmail = async (email, fullname, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.CALL_API}/api/auth/verify-email/${verificationToken}`;
    
    const mailOptions = {
      from: {
        name: 'Medicine App',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: '🔐 ยืนยันอีเมลของคุณ - Medicine App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; font-size: 24px; margin: 0;">ยืนยันอีเมลของคุณ</h1>
            </div>
            
            <div style="color: #666; line-height: 1.6; margin: 20px 0;">
              <p>สวัสดี <strong>${fullname}</strong>,</p>
              <p>ขอบคุณที่สมัครสมาชิก Medicine App! กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold;">ยืนยันอีเมล</a>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404;">
                <strong>⚠️ หมายเหตุ:</strong> ลิงก์นี้จะหมดอายุใน <strong>24 ชั่วโมง</strong>
              </div>
              
              <p>หากคุณไม่ได้สมัครสมาชิกกับเรา กรุณาเพิกเฉยต่ออีเมลนี้</p>
              
              <p style="color: #999; font-size: 12px;">
                หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
                ${verificationUrl}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #999; font-size: 14px;">
              <p>อีเมลนี้ส่งจาก Medicine App<br>
              หากมีปัญหา กรุณาติดต่อ: theerapat.kh@rmuti.ac.th</p>
            </div>
          </div>
        </div>
      `,
      text: `
        ยืนยันอีเมลของคุณ - Medicine App
        
        สวัสดี ${fullname},
        
        ขอบคุณที่สมัครสมาชิก Medicine App! 
        กรุณาคลิกลิงก์นี้เพื่อยืนยันอีเมลของคุณ:
        
        ${verificationUrl}
        
        ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง
        
        หากคุณไม่ได้สมัครสมาชิกกับเรา กรุณาเพิกเฉยต่ออีเมลนี้
        
        Medicine App Team
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail
};