
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../dbConfig');
require('dotenv').config();
const crypto = require('crypto');


// PUT /users/upload-avatar
exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const avatarPath = `uploads/avatars/${req.file.filename}`;

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('TenDangNhap', sql.NVarChar, req.user.username) // username từ JWT
      .input('Avatar', sql.NVarChar, avatarPath)
      .query('UPDATE dbo.sysNguoiDung SET Avatar = @Avatar WHERE TenDangNhap = @TenDangNhap');

    if (result.rowsAffected[0] === 0) {
      // Xóa file nếu không cập nhật được
      fs.unlinkSync(path.join(__dirname, '..', avatarPath));
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Avatar uploaded successfully', avatar: avatarPath });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Error uploading avatar', error });
  }
};


exports.login = async (req, res) => {
    console.log("login: ", req.body);
    try {
        const { username, password } = req.body;

        //console.log("req.body: ", req.body);

        // Kết nối tới pool
        const pool = await poolPromise;

        // Tìm user theo username
        const userQuery = `
        SELECT 
          TenDangNhap, 
          MatKhauKhongMaHoa,
          MatKhau, 
          TinhTrang,
          Avatar,
          Email,
          Phone 
        FROM 
          sysNguoiDung 
        WHERE 
          TenDangNhap = @username or Email = @username
      `;

        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(userQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result.recordset[0];

        // Kiểm tra tình trạng tài khoản
        if (user.TinhTrang !== 'BT') {
          return res.status(403).json({ message: 'Account is not active. Please contact support.' });
        }

        // Kiểm tra password
        
        const isMatch = (user.MatKhauKhongMaHoa === password);
        if (!isMatch) {
          const isMatch1 = await bcrypt.compare(password, user.MatKhau);
          if (!isMatch1) {
            return res.status(401).json({ message: 'Invalid username or password.' });
          }
        }

        const TenDangNhap = user.TenDangNhap;
        // Lấy vai trò người dùng
        const rolesQuery = `
        SELECT 
          MaVaiTro 
        FROM 
          sys_NguoiDungVaiTro 
        WHERE 
          MaNguoiDung = @username
      `;

        const rolesResult = await pool.request()
            .input('username', sql.NVarChar, TenDangNhap)
            .query(rolesQuery);

        const roles = rolesResult.recordset.map(role => role.MaVaiTro);
        //console.log("login: ", process.env.JWT_SECRET);

        // Tạo JWT token
        const token = jwt.sign(
            {
                username: user.TenDangNhap,
                roles: roles,
                avatar: user.Avatar,
                email: user.Email
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Trả về token
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const username = req.user.username;
    console.log("ChangePassword req.body;", req.body, username);

    // Lấy kết nối từ pool
    const pool = await poolPromise;

    // Tìm user theo `TenDangNhap`
    const userQuery = `
      SELECT 
        MatKhau, 
        MatKhauKhongMaHoa 
      FROM 
        sysNguoiDung 
      WHERE 
        TenDangNhap = @username
    `;

    const userResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(userQuery);

    console.log("ChangePassword userResult ", userResult);
  
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.recordset[0];

    // Kiểm tra mật khẩu hiện tại
    let isMatch = (user.MatKhauKhongMaHoa === currentPassword); // So sánh mật khẩu không mã hóa
    console.log("ChangePassword isMatch ", isMatch);

    if (!isMatch) {
      isMatch = await bcrypt.compare(currentPassword, user.MatKhau); // So sánh với mật khẩu đã mã hóa
    }
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Mã hóa mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu mới và đặt `MatKhauKhongMaHoa` thành rỗng
    const updateQuery = `
      UPDATE sysNguoiDung
      SET 
        MatKhau = @hashedNewPassword,
        MatKhauKhongMaHoa = ''
      WHERE 
        TenDangNhap = @username
    `;

    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('hashedNewPassword', sql.NVarChar, hashedNewPassword)
      .query(updateQuery);

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.log("ChangePassword error: ", error);

    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



// PUT /users/profile


exports.updateProfile = async (req, res) => {
  const pool = await poolPromise;

  const { phoneNumber, fullName, email } = req.body;
  try {
    const result = await pool
      .request()
      .input('TenDangNhap', sql.NVarChar, req.user.username) // username từ JWT
      .input('Phone', sql.NVarChar, phoneNumber)
      .input('Email', sql.NVarChar, email)
      .input('HoTen', sql.NVarChar, fullName)
      .query('UPDATE dbo.sysNguoiDung SET Phone = @Phone, Email = @Email, HoTen = @HoTen WHERE TenDangNhap = @TenDangNhap');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

exports.getProfile = async (req, res) => {
  const pool = await poolPromise;

  try {
    //console.log("req.user.username: ", req.user.username);
    const result = await pool
      .request()
      .input('TenDangNhap', sql.NVarChar, req.user.username) // username từ JWT
      .query('SELECT HoTen, TenDangNhap, TinhTrang, ThoiDiemDangNhapCuoi, ThoiDiemTaoTaiKhoan, Email, Phone, Avatar FROM dbo.sysNguoiDung WHERE TenDangNhap = @TenDangNhap');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log("result.recordset[0] ", result.recordset[0]);
    res.json(result.recordset[0]); // Trả về thông tin người dùng
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};