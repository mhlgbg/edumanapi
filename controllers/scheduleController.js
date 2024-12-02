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