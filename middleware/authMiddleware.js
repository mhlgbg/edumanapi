/*
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Token is missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token is not valid' });
    }
    req.user = user;
    next();
  });
};
*/
/*
const jwt = require('jsonwebtoken');  // Thêm dòng này để import jsonwebtoken

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }

  const token = authHeader.split(' ')[1]; // Tách token từ "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Token is missing' });
  }

  console.log("Token received in middleware:", token); // Kiểm tra token có được gửi đúng không
  console.log("JWT Secret:", process.env.JWT_SECRET);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("User in middleware:", err); 
      return res.status(403).json({ message: 'Token is not valid' });
    }
    
    req.user = user; // Lưu thông tin user vào req.user
    //console.log("User in middleware:", user); // Kiểm tra thông tin người dùng sau khi xác thực

    next();
  });
};
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};



module.exports = {
  authenticateToken,
  authorizeRoles,
};

*/
const jwt = require('jsonwebtoken');  // Thêm dòng này để import jsonwebtoken

const authenticateToken = (req, res, next) => {
  //console.log("a hi hi");
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing' });
  }

  const token = authHeader.split(' ')[1]; // Tách token từ "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Token is missing' });
  }

  //console.log("Token received in middleware:", token); // Kiểm tra token có được gửi đúng không
  //console.log("JWT Secret:", process.env.JWT_SECRET);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification failed:", err); // Log chi tiết lỗi từ jwt.verify
      return res.status(403).json({ message: 'Token is not valid' });
    }

    //console.log("JWT decoded user:", user); // Kiểm tra user sau khi giải mã
    req.user = user; // Lưu thông tin user vào req.user

    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Kiểm tra xem user có ít nhất 1 role trong danh sách roles được phép
    const userRoles = req.user.roles;  // Đây là mảng roles của user

    if (!userRoles || !userRoles.some(role => roles.includes(role))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};
module.exports = {
  authenticateToken,
  authorizeRoles,
};