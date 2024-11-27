const { poolPromise, sql } = require('../dbConfig');

// Lấy danh sách Khoa Hệ (LaKhoa = 0)
exports.getKhoaHe = async (req, res) => {
    try {
        const pool = await poolPromise;
        const results = await pool.request()
            .query(`SELECT MaKhoaHe, TenKhoaHe FROM KhoaHe WHERE LaKhoa = 0`);
        console.log("getKhoaHe ", results.recordset);
        res.json(results.recordset);
    } catch (error) {
        console.error('Error fetching KhoaHe:', error);
        res.status(500).json({ message: 'Error fetching KhoaHe' });
    }
};

// Lấy danh sách Ngành theo Khoa Hệ
exports.getNganh = async (req, res) => {
    const { MaKhoaHe } = req.query;
    if (!MaKhoaHe) {
        return res.json([]);
    }

    try {
        const pool = await poolPromise;
        const results = await pool.request()
            .input('MaKhoaHe', sql.NVarChar, MaKhoaHe)
            .query(`SELECT MaNganh, TenNganh FROM Nganh WHERE MaKhoaHe = @MaKhoaHe`);
        res.json(results.recordset);
    } catch (error) {
        console.error('Error fetching Nganh:', error);
        res.status(500).json({ message: 'Error fetching Nganh' });
    }
};

// Lấy danh sách Lớp chuyên ngành theo Ngành
exports.getLopChuyenNganh = async (req, res) => {
    const { MaNganh } = req.query;
    if (!MaNganh) {
        return res.json([]);
    }

    try {
        const pool = await poolPromise;
        const results = await pool.request()
            .input('MaNganh', sql.NVarChar, MaNganh)
            .query(`SELECT MaLopChuyenNganh, TenLopChuyenNganh FROM LopChuyenNganh WHERE MaNganh = @MaNganh`);
        res.json(results.recordset);
    } catch (error) {
        console.error('Error fetching LopChuyenNganh:', error);
        res.status(500).json({ message: 'Error fetching LopChuyenNganh' });
    }
};

// Lấy danh sách Sinh Viên với các bộ lọc
// Lấy danh sách Sinh Viên với các bộ lọc
exports.getSinhVien = async (req, res) => {
    const { keyword, MaKhoaHe, MaNganh, MaLopChuyenNganh, TinhTrang, page = 1, limit = 50 } = req.query;

    const offset = (page - 1) * limit;

    try {
        const pool = await poolPromise;
        const request = pool.request();

        let query = `
        SELECT sv.MaSinhVien, sv.HoDem, sv.Ten, sv.NgaySinh, sv.TinhTrang
        FROM SinhVien sv
        INNER JOIN qlsv_SinhVienLopChuyenNganh svlcn ON sv.MaSinhVien = svlcn.MaSinhVien
        INNER JOIN LopChuyenNganh lcn ON svlcn.MaLopChuyenNganh = lcn.MaLopChuyenNganh
        INNER JOIN Nganh n ON lcn.MaNganh = n.MaNganh
        INNER JOIN KhoaHe kh ON n.MaKhoaHe = kh.MaKhoaHe
        WHERE 1=1
      `;

        // Bộ lọc từ khóa
        if (keyword) {
            query += ` AND (sv.MaSinhVien LIKE @keyword OR sv.HoDem LIKE @keyword OR sv.Ten LIKE @keyword)`;
            request.input('keyword', sql.NVarChar, `%${keyword}%`);
        }

        // Bộ lọc Khoa Hệ
        if (MaKhoaHe) {
            query += ` AND kh.MaKhoaHe = @MaKhoaHe`;
            request.input('MaKhoaHe', sql.NVarChar, MaKhoaHe);
        }

        // Bộ lọc Ngành
        if (MaNganh) {
            query += ` AND n.MaNganh = @MaNganh`;
            request.input('MaNganh', sql.NVarChar, MaNganh);
        }

        // Bộ lọc Lớp
        if (MaLopChuyenNganh) {
            query += ` AND lcn.MaLopChuyenNganh = @MaLopChuyenNganh`;
            request.input('MaLopChuyenNganh', sql.NVarChar, MaLopChuyenNganh);
        }

        // Bộ lọc Tình Trạng
        if (TinhTrang) {
            query += ` AND sv.TinhTrang = @TinhTrang`;
            request.input('TinhTrang', sql.NVarChar, TinhTrang);
        }

        // Phân trang
        query += ` ORDER BY sv.MaSinhVien OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, parseInt(limit, 10));

        const results = await request.query(query);

        // Lấy tổng số bản ghi
        let totalQuery = `
        SELECT COUNT(*) AS Total
        FROM SinhVien sv
        INNER JOIN qlsv_SinhVienLopChuyenNganh svlcn ON sv.MaSinhVien = svlcn.MaSinhVien
        INNER JOIN LopChuyenNganh lcn ON svlcn.MaLopChuyenNganh = lcn.MaLopChuyenNganh
        INNER JOIN Nganh n ON lcn.MaNganh = n.MaNganh
        INNER JOIN KhoaHe kh ON n.MaKhoaHe = kh.MaKhoaHe
        WHERE 1=1
      `;

        const totalRequest = pool.request();

        // Thêm các điều kiện vào totalQuery
        if (keyword) {
            totalQuery += ` AND (sv.MaSinhVien LIKE @keyword OR sv.HoDem LIKE @keyword OR sv.Ten LIKE @keyword)`;
            totalRequest.input('keyword', sql.NVarChar, `%${keyword}%`);
        }
        if (MaKhoaHe) {
            totalQuery += ` AND kh.MaKhoaHe = @MaKhoaHe`;
            totalRequest.input('MaKhoaHe', sql.NVarChar, MaKhoaHe);
        }
        if (MaNganh) {
            totalQuery += ` AND n.MaNganh = @MaNganh`;
            totalRequest.input('MaNganh', sql.NVarChar, MaNganh);
        }
        if (MaLopChuyenNganh) {
            totalQuery += ` AND lcn.MaLopChuyenNganh = @MaLopChuyenNganh`;
            totalRequest.input('MaLopChuyenNganh', sql.NVarChar, MaLopChuyenNganh);
        }
        if (TinhTrang) {
            totalQuery += ` AND sv.TinhTrang = @TinhTrang`;
            totalRequest.input('TinhTrang', sql.NVarChar, TinhTrang);
        }

        const totalResults = await totalRequest.query(totalQuery);
        const total = totalResults.recordset[0]?.Total || 0;

        res.json({
            students: results.recordset,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching SinhVien:', error);
        res.status(500).json({ message: 'Error fetching SinhVien' });
    }
};


exports.getStudentScores = async (req, res) => {
    console.log("getStudentScores");
    const { maSinhVien } = req.params;

    try {
        const pool = await poolPromise;

        if (!maSinhVien) {
            return res.status(400).json({ message: 'Mã sinh viên là bắt buộc.' });
        }

        // Truy vấn lấy thông tin điểm và môn học
        const studentScoreQuery = `
        SELECT 
          dtk.MaSinhVien,
          sv.HoDem,
          sv.Ten,
          sv.NgaySinh,
          dtk.SoTinChi,
          dtk.Diem AS DiemHe10,
          dtk.GhiChu,
          hp.TenHocPhan
        FROM DiemTongKet dtk
        INNER JOIN HocPhan hp ON dtk.MaHocPhan = hp.MaHocPhan
        INNER JOIN SinhVien sv ON dtk.MaSinhVien = sv.MaSinhVien
        WHERE dtk.MaSinhVien = @MaSinhVien
        ORDER BY dtk.MaHocPhan DESC
        `;

        const scoreRequest = pool.request();
        scoreRequest.input('MaSinhVien', sql.NVarChar, maSinhVien);

        const result = await scoreRequest.query(studentScoreQuery);

        if (!result.recordset.length) {
            return res.status(404).json({ message: 'Không tìm thấy bảng điểm của sinh viên.' });
        }

        // Truy vấn MaLopChuyenNganh và thông tin KhoaHoc
        const classQuery = `
        SELECT 
            lcn.MaLopChuyenNganh, 
            lcn.NamNhapHoc, 
            lcn.NamDuKienTotNghiep 
        FROM qlsv_SinhVienLopChuyenNganh svc
        INNER JOIN LopChuyenNganh lcn ON svc.MaLopChuyenNganh = lcn.MaLopChuyenNganh
        WHERE svc.MaSinhVien = @MaSinhVien
        `;
        const classResult = await pool
            .request()
            .input('MaSinhVien', sql.NVarChar, maSinhVien)
            .query(classQuery);

        const classInfo = classResult.recordset[0];
        const maLopChuyenNganh = classInfo?.MaLopChuyenNganh || 'Không xác định';
        const khoaHoc = classInfo ? `${classInfo.NamNhapHoc}-${classInfo.NamDuKienTotNghiep}` : 'Không xác định';

        // Lấy thông tin ngành và khoa hệ
        const additionalInfoQuery = `
        SELECT n.TenNganh, kh.TenKhoaHe 
        FROM LopChuyenNganh lcn
        INNER JOIN Nganh n ON lcn.MaNganh = n.MaNganh
        INNER JOIN KhoaHe kh ON n.MaKhoaHe = kh.MaKhoaHe
        WHERE lcn.MaLopChuyenNganh = @MaLopChuyenNganh
        `;
        const additionalInfoResult = await pool
            .request()
            .input('MaLopChuyenNganh', sql.NVarChar, maLopChuyenNganh)
            .query(additionalInfoQuery);

        const { TenNganh: tenNganh, TenKhoaHe: tenKhoaHe } =
            additionalInfoResult.recordset[0] || { TenNganh: 'Không xác định', TenKhoaHe: 'Không xác định' };

        // Định dạng dữ liệu trả về
        const studentInfo = {
            MaSinhVien: result.recordset[0].MaSinhVien,
            HoDem: result.recordset[0].HoDem,
            Ten: result.recordset[0].Ten,
            NgaySinh: result.recordset[0].NgaySinh,
            MaLopChuyenNganh: maLopChuyenNganh,
            TenNganh: tenNganh,
            TenKhoaHe: tenKhoaHe,
            KhoaHoc: khoaHoc, // Bổ sung trường KhoaHoc
        };

        // Hàm quy đổi thang điểm chữ
        const convertToGradeLetter = (score) => {
            if (score < 4) return 'F';
            if (score <= 4.9) return 'D';
            if (score <= 5.4) return 'D+';
            if (score <= 6.4) return 'C';
            if (score <= 6.9) return 'C+';
            if (score <= 7.9) return 'B';
            if (score >= 9) return 'A+';
            if (score >= 8.5) return 'A';
            return 'B+';
        };

        // Hàm quy đổi từ thang điểm chữ sang thang điểm 4
        const convertToGradePoint = (gradeLetter) => {
            switch (gradeLetter) {
                case 'A+': return 4;
                case 'A': return 3.7;
                case 'B+': return 3.5;
                case 'B': return 3;
                case 'C+': return 2.5;
                case 'C': return 2;
                case 'D+': return 1.5;
                case 'D': return 1;
                default: return 0; // F
            }
        };

        let totalCredits = 0; // Tổng số tín chỉ tích lũy
        let totalGradePoints = 0; // Tổng số tín chỉ x điểm hệ 4

        const scores = result.recordset.map((item, index) => {
            const gradeLetter = convertToGradeLetter(item.DiemHe10);
            const gradePoint = convertToGradePoint(gradeLetter);

            // Chỉ tích lũy nếu điểm chữ khác F
            /*if (gradeLetter !== 'F') {
                totalCredits += item.SoTinChi;
                totalGradePoints += item.SoTinChi * gradePoint;
            }*/
            totalCredits += item.SoTinChi;
            totalGradePoints += item.SoTinChi * gradePoint;

            return {
                STT: index + 1,
                TenHocPhan: item.TenHocPhan,
                SoTinChi: item.SoTinChi,
                DiemHe10: item.DiemHe10,
                DiemChu: gradeLetter,
                DiemHe4: gradePoint,
                GhiChu: item.GhiChu,
            };
        });

        // Tính trung bình tích lũy
        const avgGradePoint = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

        // Bổ sung thông tin tích lũy vào studentInfo
        studentInfo.TongTinChiTichLuy = totalCredits;
        studentInfo.TrungBinhTichLuy = parseFloat(avgGradePoint);

        // Trả về JSON
        res.json({
            studentInfo,
            scores,
        });
    } catch (error) {
        console.error('Error fetching student scores:', error);
        res.status(500).json({ message: 'Lỗi khi lấy bảng điểm của sinh viên.' });
    }
};

