const express = require('express');
const { sql, poolPromise } = require('./dbConfig');
const ExcelJS = require('exceljs'); // Import ExcelJS
const router = express.Router();


router.get('/api/data', async (req, res) => {
  try {
    const pool = await poolPromise; // Kết nối tới SQL Server
    const result = await pool.request().query('SELECT * FROM KhoaHe'); // Thực hiện truy vấn
    res.json(result.recordset); // Trả về dữ liệu dạng JSON
  } catch (err) {
    console.error('Lỗi khi truy vấn dữ liệu', err);
    res.status(500).send('Có lỗi xảy ra');
  }
});

router.get('/api/getDotThu', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT DotThuHocPhiId AS id, TenHienThi AS tenDotThu FROM hp_DotThuHocPhi order by DotThuHocPhiId desc');
    res.json(result.recordset);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách đợt thu:', err);
    res.status(500).send('Có lỗi xảy ra');
  }
});

router.get('/api/exportExcel', async (req, res) => {
  const { dotThuId, loaiSinhVien } = req.query;

  try {
    const pool = await poolPromise;

    // Truy vấn dữ liệu từ database (ví dụ)
    const query = `
      SELECT khoa, nganh, namnhaphoc, soluongsinhvien, soluongsinhvienphatsinh, tonghocphi, danop, conno
      FROM your_table_name
      WHERE dotThuId = @dotThuId AND loaiSinhVien = @loaiSinhVien
    `;
    const result = await pool.request()
      .input('dotThuId', sql.Int, dotThuId)
      .input('loaiSinhVien', sql.NVarChar, loaiSinhVien)
      .query(query);

    // Tạo file Excel mới
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo học phí');

    // Định nghĩa các cột cho file Excel
    worksheet.columns = [
      { header: 'Khoa', key: 'khoa', width: 30 },
      { header: 'Ngành', key: 'nganh', width: 30 },
      { header: 'Năm nhập học', key: 'namnhaphoc', width: 15 },
      { header: 'Số lượng sinh viên', key: 'soluongsinhvien', width: 20 },
      { header: 'Số lượng sinh viên phát sinh học phí', key: 'soluongsinhvienphatsinh', width: 30 },
      { header: 'Tổng học phí phải nộp', key: 'tonghocphi', width: 25 },
      { header: 'Đã nộp', key: 'danop', width: 20 },
      { header: 'Còn phải nộp', key: 'conno', width: 20 }
    ];

    // Thêm dữ liệu vào file Excel
    result.recordset.forEach(row => {
      worksheet.addRow(row);
    });

    // Đặt tiêu đề cho file Excel
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'BaocaoHocPhi.xlsx');

    // Xuất file Excel
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Lỗi khi xuất file Excel:', err);
    res.status(500).send('Có lỗi xảy ra');
  }
});

// API getStudentData
router.get('/api/getStudentData', async (req, res) => {
  const { dotThuId, loaiSinhVien } = req.query; // Nhận đợt thu từ query parameter

  try {
    // Kết nối tới SQL Server
    const pool = await poolPromise;

    // Câu truy vấn để lấy danh sách sinh viên có phát sinh khoản thu
    const query = `
        SELECT sv.MaSinhVien, sv.HoVaTen, k.TenKhoaHe AS Khoa, n.TenNganh AS Nganh,
               l.NamNhapHoc, 
               kt.SoLuong * kt.DonGia AS tongHocPhi, 
               ISNULL(SUM(pt.SoTien), 0) AS daNop, 
               (kt.SoLuong * kt.DonGia - ISNULL(SUM(pt.SoTien), 0)) AS conNo
        FROM SinhVien sv
        INNER JOIN qlsv_SinhVienLopChuyenNganh slcn ON sv.MaSinhVien = slcn.MaSinhVien
        INNER JOIN LopChuyenNganh l ON slcn.MaLopChuyenNganh = l.MaLopChuyenNganh
        INNER JOIN Nganh n ON l.MaNganh = n.MaNganh
        INNER JOIN KhoaHe k ON n.MaKhoaHe = k.MaKhoaHe
        INNER JOIN hp_KhoanThu kt ON sv.MaSinhVien = kt.MaSinhVien
        LEFT JOIN hp_PhieuThu pt ON sv.MaSinhVien = pt.MaSinhVien AND kt.DotThuHocPhiId = pt.DotThuHocPhiId
        WHERE kt.DotThuHocPhiId = @dotThuId AND sv.MaSinhVien LIKE @loaiSinhVien + '%'
        GROUP BY sv.MaSinhVien, sv.HoVaTen, k.TenKhoaHe, n.TenNganh, l.NamNhapHoc, kt.SoLuong, kt.DonGia
      `;

    const result = await pool.request()
      .input('dotThuId', sql.Int, dotThuId)
      .input('loaiSinhVien', sql.NVarChar, loaiSinhVien)
      .query(query);

    // Trả về dữ liệu dạng JSON để đổ ra form bảng trên giao diện
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    console.error('Lỗi khi truy vấn dữ liệu', err);
    res.status(500).send('Có lỗi xảy ra trong quá trình truy vấn dữ liệu');
  }
});


router.get('/api/report', async (req, res) => {
  const { dotThuId, loaiSinhVien } = req.query;

  try {
    const pool = await poolPromise;

    // Truy vấn dữ liệu từ cơ sở dữ liệu
    const query = `
        SELECT k.TenKhoaHe AS khoa, n.TenNganh AS nganh, lcn.NamNhapHoc AS namNhapHoc,
  COUNT(DISTINCT sv.MaSinhVien) AS soLuongSinhVien,  -- Đếm sinh viên duy nhất
  COUNT(DISTINCT CASE WHEN kt.DonGia * kt.SoLuong > 0 THEN sv.MaSinhVien ELSE NULL END) AS soLuongSinhVienPhatSinh,  -- Đếm sinh viên phát sinh học phí duy nhất
  SUM(kt.DonGia * kt.SoLuong) AS tongHocPhi,
  SUM(pt.SoTien) AS daNop,
  SUM((kt.DonGia * kt.SoLuong) - ISNULL(pt.SoTien, 0)) AS conNo
FROM hp_KhoanThu kt
JOIN SinhVien sv ON kt.MaSinhVien = sv.MaSinhVien
JOIN qlsv_SinhVienLopChuyenNganh svlcn ON sv.MaSinhVien = svlcn.MaSinhVien
JOIN LopChuyenNganh lcn ON svlcn.MaLopChuyenNganh = lcn.MaLopChuyenNganh
JOIN Nganh n ON lcn.MaNganh = n.MaNganh
JOIN KhoaHe k ON n.MaKhoa = k.MaKhoaHe
LEFT JOIN hp_PhieuThu pt ON pt.MaSinhVien = kt.MaSinhVien AND pt.DotThuHocPhiId = kt.DotThuHocPhiId
WHERE kt.DotThuHocPhiId = @dotThuId AND sv.MaSinhVien LIKE @loaiSinhVien + '%'
GROUP BY k.TenKhoaHe, n.TenNganh, lcn.NamNhapHoc
ORDER BY k.TenKhoaHe, n.TenNganh, lcn.NamNhapHoc;
      `;

    const result = await pool.request()
      .input('dotThuId', sql.Int, dotThuId)
      .input('loaiSinhVien', sql.NVarChar, loaiSinhVien)
      .query(query);

    // Trả về dữ liệu dạng JSON để đổ ra form bảng trên giao diện
    res.json(result.recordset);

  } catch (err) {
    console.error('Lỗi khi lấy dữ liệu báo cáo:', err);
    res.status(500).send('Có lỗi xảy ra');
  }
});

module.exports = router;
