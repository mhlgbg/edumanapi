const { poolPromise, sql } = require('../dbConfig');

exports.getGioHoc = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
        SELECT GioHocId, ThuTuGioTrongNgay, ThoiDiemBatDau, ThoiDiemKetThuc
        FROM tkb_GioHoc
        ORDER BY ThuTuGioTrongNgay
      `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching GioHoc:', error);
        res.status(500).json({ message: 'Error fetching GioHoc' });
    }
};

exports.getPhongHoc = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
        SELECT SoHieuPhong, TenHienThi
        FROM tkb_PhongHoc
        ORDER BY TenHienThi
      `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching PhongHoc:', error);
        res.status(500).json({ message: 'Error fetching PhongHoc' });
    }
};

exports.getNhanSu = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
        SELECT MaNhanhSu, CONCAT(HoDem, ' ', Ten) AS HoVaTen
        FROM NhanSu
        ORDER BY HoVaTen
      `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching NhanSu:', error);
        res.status(500).json({ message: 'Error fetching NhanSu' });
    }
};

exports.updateSchedule = async (req, res) => {
    const { scheduleId } = req.params;
    const { ThuTrongTuan, GioBatDauId, GioKetThucId, SoHieuPhong, MaNhanSu, TuNgay, DenNgay } = req.body;

    if (!scheduleId || !ThuTrongTuan || !GioBatDauId || !GioKetThucId || !SoHieuPhong || !MaNhanSu || !TuNgay || !DenNgay) {
        return res.status(400).json({ message: 'Missing required fields for updating schedule.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ThoiKhoaBieuId', sql.Int, scheduleId)
            .input('ThuTrongTuan', sql.Int, ThuTrongTuan)
            .input('GioBatDauId', sql.Int, GioBatDauId)
            .input('GioKetThucId', sql.Int, GioKetThucId)
            .input('SoHieuPhong', sql.NVarChar(50), SoHieuPhong)
            .input('MaNhanSu', sql.NVarChar(50), MaNhanSu)
            .input('TuNgay', sql.Date, TuNgay)
            .input('DenNgay', sql.Date, DenNgay)
            .query(`
          UPDATE tkb_ThoiKhoaBieu
          SET ThuTrongTuan = @ThuTrongTuan,
              GioBatDauId = @GioBatDauId,
              GioKetThucId = @GioKetThucId,
              SoHieuPhong = @SoHieuPhong,
              MaNhanSu = @MaNhanSu,
              TuNgay = @TuNgay,
              DenNgay = @DenNgay
          WHERE ThoiKhoaBieuId = @ThoiKhoaBieuId
        `);

        res.status(200).json({ message: 'Schedule updated successfully.' });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ message: 'Error updating schedule.' });
    }
};

exports.deleteSchedule = async (req, res) => {
    const { scheduleId } = req.params;

    if (!scheduleId) {
        return res.status(400).json({ message: 'Schedule ID is required.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ThoiKhoaBieuId', sql.Int, scheduleId)
            .query(`
          DELETE FROM tkb_ThoiKhoaBieu
          WHERE ThoiKhoaBieuId = @ThoiKhoaBieuId
        `);

        res.status(200).json({ message: 'Schedule deleted successfully.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ message: 'Error deleting schedule.' });
    }
};    

// API lấy thời khóa biểu theo giáo viên
// API lấy thời khóa biểu theo giáo viên (không nhóm)
exports.getScheduleByTeacher = async (req, res) => {
    console.log("getScheduleByTeacher ", req.query);
    try {
        const { HocKiId, NgayCanLay } = req.query;

        // Kiểm tra đầu vào
        if (!HocKiId || !NgayCanLay) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ HocKiId và NgayCanLay' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('HocKiId', HocKiId)
            .input('NgayCanLay', NgayCanLay)
            .query(` 
                SELECT 
                    ns.MaNhanhSu,
                    CONCAT(ns.HoDem, ' ', ns.Ten) AS HoVaTen,
                    tkb.ThuTrongTuan,
                    gh.ThuTuGioTrongNgay AS TietHoc,
                    tkb.SoHieuPhong,
                    hp.TenHocPhan,
                    tkb.TuNgay,
                    tkb.DenNgay
                FROM tkb_ThoiKhoaBieu tkb
                INNER JOIN tkb_LopHocPhanHocKi lhp ON tkb.LopHocPhanHocKiId = lhp.LopHocPhanHocKiId
                INNER JOIN HocPhan hp ON lhp.MaHocPhan = hp.MaHocPhan
                INNER JOIN NhanSu ns ON tkb.MaNhanSu = ns.MaNhanhSu
                INNER JOIN tkb_GioHoc gh ON tkb.GioBatDauId = gh.GioHocId
                WHERE 
                    lhp.HocKiId = @HocKiId
                    AND @NgayCanLay BETWEEN tkb.TuNgay AND tkb.DenNgay
                ORDER BY 
                    ns.MaNhanhSu,
                    tkb.ThuTrongTuan,
                    gh.ThuTuGioTrongNgay
            `);

        // Kiểm tra nếu không có kết quả
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thời khóa biểu cho học kỳ và ngày yêu cầu' });
        }

        // Trả về dữ liệu phẳng
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching schedule by teacher:', error);
        res.status(500).json({ message: 'Error fetching schedule by teacher' });
    }
};


exports.getScheduleByHocKi = async (req, res) => {
    console.log("getSchedules", req.query);
    try {
        const { HocKiId, NgayCanLay } = req.query;

        if (!HocKiId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp HocKiId' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('HocKiId', HocKiId)
            .input('NgayCanLay', NgayCanLay || null) // Nếu cần lọc theo ngày
            .query(`
                SELECT 
                    tkb.ThoiKhoaBieuId,
                    tkb.LopHocPhanHocKiId,
                    tkb.MaNhanSu AS MaGiangVien,
                    CONCAT(ns.HoDem, ' ', ns.Ten) AS GiangVien,
                    tkb.SoHieuPhong,
                    tkb.ThuTrongTuan,
                    CONCAT(gh_start.ThuTuGioTrongNgay, '-', gh_end.ThuTuGioTrongNgay) AS TietHoc,
                    CONCAT(
                        FORMAT(gh_start.ThoiDiemBatDau / 60, '00'), ':', FORMAT(gh_start.ThoiDiemBatDau % 60, '00'),
                        '-', FORMAT(gh_end.ThoiDiemKetThuc / 60, '00'), ':', FORMAT(gh_end.ThoiDiemKetThuc % 60, '00')
                    ) AS ThoiGian,
                    hp.TenHocPhan,
                    lhp.TenLop AS TenLop,
                    tkb.TuNgay,
                    tkb.DenNgay
                FROM tkb_ThoiKhoaBieu tkb
                INNER JOIN tkb_LopHocPhanHocKi lhp ON tkb.LopHocPhanHocKiId = lhp.LopHocPhanHocKiId
                INNER JOIN HocPhan hp ON lhp.MaHocPhan = hp.MaHocPhan
                INNER JOIN NhanSu ns ON tkb.MaNhanSu = ns.MaNhanhSu
                INNER JOIN tkb_GioHoc gh_start ON tkb.GioBatDauId = gh_start.GioHocId
                INNER JOIN tkb_GioHoc gh_end ON tkb.GioKetThucId = gh_end.GioHocId
                WHERE lhp.HocKiId = @HocKiId
                ${NgayCanLay ? 'AND @NgayCanLay BETWEEN tkb.TuNgay AND tkb.DenNgay' : ''}
                ORDER BY tkb.ThuTrongTuan, tkb.SoHieuPhong, gh_start.ThuTuGioTrongNgay;
            `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu thời khóa biểu' });
    }
};
