const { poolPromise, sql } = require('../dbConfig');

exports.getAll = async (req, res) => {
    const { HocKiId, keyword } = req.query;

    if (!HocKiId) {
        return res.status(400).json({ message: 'Học kỳ Id là bắt buộc.' });
    }

    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input('HocKiId', sql.Int, HocKiId)
            .input('Keyword', sql.NVarChar(50), `%${keyword || ''}%`);

        const query = `
            SELECT 
                lhhk.LopHocPhanHocKiId,
                lhhk.MaHocPhan,
                hp.TenHocPhan,
                lhhk.TenLop,
                lhhk.TinhTrang,
                COUNT(DISTINCT svlhptk.MaSinhVien) AS SoLuongSinhVien,
                COUNT(DISTINCT tkb.ThoiKhoaBieuId) AS SoLichHocDaTao
            FROM tkb_LopHocPhanHocKi lhhk
            LEFT JOIN HocPhan hp ON lhhk.MaHocPhan = hp.MaHocPhan
            LEFT JOIN tkb_SinhVienLopHocPhanHocTrongKi svlhptk ON lhhk.LopHocPhanHocKiId = svlhptk.LopHocPhanHocTrongKiId
            LEFT JOIN tkb_ThoiKhoaBieu tkb ON lhhk.LopHocPhanHocKiId = tkb.LopHocPhanHocKiId
            WHERE lhhk.HocKiId = @HocKiId
              AND (
                  lhhk.MaHocPhan LIKE @Keyword OR
                  hp.TenHocPhan LIKE @Keyword OR
                  lhhk.TenLop LIKE @Keyword OR
                  lhhk.TinhTrang LIKE @Keyword
              )
            GROUP BY 
                lhhk.LopHocPhanHocKiId,
                lhhk.MaHocPhan,
                hp.TenHocPhan,
                lhhk.TenLop,
                lhhk.TinhTrang
            ORDER BY lhhk.TenLop;
        `;

        const result = await request.query(query);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi lấy danh sách lớp học phần.' });
    }
};


//Lấy danh sách sinh viên của lớp
exports.getStudents = async (req, res) => {
    const { lopHocPhanHocKiId } = req.params;

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('LopHocPhanHocKiId', sql.Int, lopHocPhanHocKiId)
            .query(`
                SELECT sv.MaSinhVien, sv.HoDem + ' ' + sv.Ten AS HoTen, sv.NgaySinh, lcn.MaLopChuyenNganh AS LopChuyenNganh
                FROM tkb_SinhVienLopHocPhanHocTrongKi sl
                JOIN SinhVien sv ON sl.MaSinhVien = sv.MaSinhVien
                LEFT JOIN qlsv_SinhVienLopChuyenNganh lcn ON sv.MaSinhVien = lcn.MaSinhVien
                WHERE sl.LopHocPhanHocTrongKiId = @LopHocPhanHocKiId
            `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi lấy danh sách sinh viên.' });
    }
};

//Loại sinh viên khỏi lớp
exports.removeStudent = async (req, res) => {
    const { lopHocPhanHocKiId, maSinhVien } = req.params;

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('LopHocPhanHocKiId', sql.Int, lopHocPhanHocKiId)
            .input('MaSinhVien', sql.NVarChar(50), maSinhVien)
            .query(`
                DELETE FROM tkb_SinhVienLopHocPhanHocTrongKi
                WHERE LopHocPhanHocTrongKiId = @LopHocPhanHocKiId
                AND MaSinhVien = @MaSinhVien
            `);

        res.status(200).json({ message: 'Xóa sinh viên khỏi lớp thành công.' });
    } catch (error) {
        console.error('Error removing student:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi xóa sinh viên khỏi lớp.' });
    }
};

//Thêm sinh viên vào lớp
exports.addStudents = async (req, res) => {
    const { lopHocPhanHocKiId } = req.params;
    const { studentIds } = req.body; // Danh sách mã sinh viên

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: 'Danh sách mã sinh viên không hợp lệ.' });
    }

    try {
        const pool = await poolPromise;

        // Lấy HocKiId và MaHocPhan từ LopHocPhanHocKiId
        const { recordset } = await pool.request()
            .input('LopHocPhanHocKiId', sql.Int, lopHocPhanHocKiId)
            .query(`
                SELECT HocKiId, MaHocPhan
                FROM tkb_LopHocPhanHocKi
                WHERE LopHocPhanHocKiId = @LopHocPhanHocKiId
            `);

        if (recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học phần.' });
        }

        const { HocKiId, MaHocPhan } = recordset[0];

        for (const maSinhVien of studentIds) {
            // Thêm vào bảng tkb_SinhVienLopHocPhanHocTrongKi
            await pool.request()
                .input('LopHocPhanHocKiId', sql.Int, lopHocPhanHocKiId)
                .input('MaSinhVien', sql.NVarChar(50), maSinhVien)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM tkb_SinhVienLopHocPhanHocTrongKi
                        WHERE LopHocPhanHocKiId = @LopHocPhanHocKiId
                        AND MaSinhVien = @MaSinhVien
                    )
                    INSERT INTO tkb_SinhVienLopHocPhanHocTrongKi (LopHocPhanHocKiId, MaSinhVien, NguoiTao, TinhTrang, ThoiDiemCapNhat, IsLocked)
                    VALUES (@LopHocPhanHocKiId, @MaSinhVien, 'System', 'BT', GETDATE(), 0)
                `);

            // Thêm vào bảng tkb_SinhVienHocPhanHocKi
            await pool.request()
                .input('HocKiId', sql.Int, HocKiId)
                .input('MaSinhVien', sql.NVarChar(50), maSinhVien)
                .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM tkb_SinhVienHocPhanHocKi svhphk
                        WHERE svhphk.HocKiId = @HocKiId AND svhphk.MaSinhVien = @MaSinhVien AND svhphk.MaHocPhan = @MaHocPhan
                    )
                    INSERT INTO tkb_SinhVienHocPhanHocKi (HocKiId, MaSinhVien, MaHocPhan, TinhTrang)
                    VALUES (@HocKiId, @MaSinhVien, @MaHocPhan, 'BT');
                `);
        }

        res.status(200).json({ message: 'Thêm sinh viên vào lớp thành công.' });
    } catch (error) {
        console.error('Error adding students:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi thêm sinh viên vào lớp.' });
    }
};


exports.addSchedule = async (req, res) => {
    const { classId } = req.params;
    const { ThuTrongTuan, GioBatDauId, GioKetThucId, SoHieuPhong, MaNhanSu, TuNgay, DenNgay } = req.body;

    if (!classId || !ThuTrongTuan || !GioBatDauId || !GioKetThucId || !SoHieuPhong || !MaNhanSu || !TuNgay || !DenNgay) {
        return res.status(400).json({ message: 'Missing required fields for adding schedule.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('LopHocPhanHocKiId', sql.Int, classId)
            .input('ThuTrongTuan', sql.Int, ThuTrongTuan)
            .input('TuanTrongKi', sql.Int, 0)
            .input('GioBatDauId', sql.Int, GioBatDauId)
            .input('GioKetThucId', sql.Int, GioKetThucId)
            .input('SoHieuPhong', sql.NVarChar(50), SoHieuPhong)
            .input('MaNhanSu', sql.NVarChar(50), MaNhanSu)
            .input('TuNgay', sql.Date, TuNgay)
            .input('DenNgay', sql.Date, DenNgay)
            .query(`
          INSERT INTO tkb_ThoiKhoaBieu (LopHocPhanHocKiId, ThuTrongTuan, TuanTrongKi, GioBatDauId, GioKetThucId, SoHieuPhong, MaNhanSu, TuNgay, DenNgay)
          VALUES (@LopHocPhanHocKiId, @ThuTrongTuan, @TuanTrongKi, @GioBatDauId, @GioKetThucId, @SoHieuPhong, @MaNhanSu, @TuNgay, @DenNgay)
        `);

        res.status(201).json({ message: 'Schedule added successfully.' });
    } catch (error) {
        console.error('Error adding schedule:', error);
        res.status(500).json({ message: 'Error adding schedule.' });
    }
};

exports.getSchedules = async (req, res) => {
    const { classId } = req.params;

    if (!classId) {
        return res.status(400).json({ message: 'Class ID is required.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('LopHocPhanHocKiId', sql.Int, classId)
            .query(`
          SELECT tkb.ThoiKhoaBieuId, tkb.ThuTrongTuan, tkb.GioBatDauId, tkb.GioKetThucId,
                 tkb.SoHieuPhong, tkb.MaNhanSu, tkb.TuNgay, tkb.DenNgay,
                 ph.TenHienThi AS PhongHoc,
                 ns.HoDem + ' ' + ns.Ten AS GiaoVien,
                 gb.ThuTuGioTrongNgay AS GioBatDauThuTu,
                 gk.ThuTuGioTrongNgay AS GioKetThucThuTu
          FROM tkb_ThoiKhoaBieu tkb
          LEFT JOIN tkb_PhongHoc ph ON tkb.SoHieuPhong = ph.SoHieuPhong
          LEFT JOIN NhanSu ns ON tkb.MaNhanSu = ns.MaNhanhSu
          LEFT JOIN tkb_GioHoc gb ON tkb.GioBatDauId = gb.GioHocId
          LEFT JOIN tkb_GioHoc gk ON tkb.GioKetThucId = gk.GioHocId
          WHERE tkb.LopHocPhanHocKiId = @LopHocPhanHocKiId
          ORDER BY tkb.TuNgay, tkb.ThuTrongTuan
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ message: 'Error fetching schedules.' });
    }
};

exports.getRelatedClasses = async (req, res) => {
    const { HocKiId, MaHocPhan, MaNhom } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input('HocKiId', sql.Int, HocKiId)
            .input('MaHocPhan', sql.NVarChar, MaHocPhan)
            .input('MaNhom', sql.NVarChar, MaNhom)
            .query(`
          SELECT DISTINCT kdt.MaLop
          FROM tbk_KeHoachDaoTao kdt          
          WHERE kdt.HocKiId = @HocKiId AND kdt.MaHocPhan = @MaHocPhan AND kdt.MaNhom = @MaNhom
        `);
        console.log("getRelatedClasses ", result.recordset);

        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching related classes', error });
    }
};
