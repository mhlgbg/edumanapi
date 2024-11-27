const sql = require('mssql');

const config = {
  user: 'sa', // Tài khoản SQL Server
  password: '123456', // Mật khẩu
  server: 'localhost\\SQLEXPRESS', // Phiên bản SQL Server
  port: 1433, // Cập nhật cổng chính xác

  database: 'db_dhhb', // Tên database
  connectionTimeout: 60000,  // Tăng thời gian chờ kết nối (60 giây)
  requestTimeout: 60000,      // Tăng thời gian chờ request (60 giây)
  
  options: {
    encrypt: false, // Không mã hóa
    trustServerCertificate: true // Tin cậy chứng chỉ tự ký
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Kết nối tới SQL Server thành công');
    return pool;
  })
  .catch(err => {
    console.error('Lỗi khi kết nối tới SQL Server:', err); // Log ra lỗi chi tiết
  });

module.exports = {
  sql, poolPromise
};
