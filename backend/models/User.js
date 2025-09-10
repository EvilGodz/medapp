const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // สร้างผู้ใช้ใหม่ (เดิม)
  static async create(userData) {
    const { fullname, email, password, birth_date, weight, height } = userData;
    
    // เข้ารหัสรหัสผ่าน
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (fullname, email, password, birth_date, weight, height)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, fullname, email, birth_date, weight, height, created_at
    `;
    
    const values = [fullname, email, hashedPassword, birth_date, weight, height];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // สร้างผู้ใช้ใหม่พร้อม Email Verification (ใหม่)
  static async createWithVerification(userData) {
    const { 
      fullname, 
      email, 
      password, 
      birth_date, 
      weight, 
      height, 
      verificationToken, 
      verificationExpires 
    } = userData;
    
    // เข้ารหัสรหัสผ่าน
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (
        fullname, 
        email, 
        password, 
        birth_date, 
        weight, 
        height, 
        email_verified, 
        verification_token, 
        verification_token_expires
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, fullname, email, birth_date, weight, height, email_verified, created_at
    `;
    
    const values = [
      fullname, 
      email, 
      hashedPassword, 
      birth_date, 
      weight, 
      height, 
      false, // email_verified = false
      verificationToken, 
      verificationExpires
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // ค้นหาผู้ใช้ด้วย email (อัปเดตให้รวม email_verified)
  static async findByEmail(email) {
    const query = `
      SELECT 
        id, 
        fullname, 
        email, 
        password, 
        birth_date, 
        weight, 
        height, 
        email_verified, 
        verification_token, 
        verification_token_expires, 
        created_at 
      FROM users 
      WHERE email = $1
    `;
    
    try {
      const result = await pool.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // ตรวจสอบรหัสผ่าน (เดิม)
  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  // ค้นหาผู้ใช้ด้วย ID (อัปเดตให้รวม email_verified)
  static async findById(id) {
    const query = `
      SELECT 
        id, 
        fullname, 
        email, 
        birth_date, 
        weight, 
        height, 
        email_verified, 
        created_at 
      FROM users 
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // ค้นหาผู้ใช้ด้วย verification token (ใหม่)
  static async findByVerificationToken(token) {
    const query = `
      SELECT 
        id, 
        fullname, 
        email, 
        email_verified, 
        verification_token_expires 
      FROM users 
      WHERE verification_token = $1
    `;
    
    try {
      const result = await pool.query(query, [token]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;