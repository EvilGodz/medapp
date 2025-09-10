const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'ไม่พบ Access Token'
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุ'
      });
    }
    
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;