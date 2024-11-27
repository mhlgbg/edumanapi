const { poolPromise, sql } = require('../dbConfig');
// Lấy danh sách học kỳ
exports.getSemesters = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`SELECT HocKiId, TenHienThi FROM HocKi ORDER BY NgayBatDauHocKi DESC`);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching semesters:', error);
        res.status(500).json({ message: 'Error fetching semesters' });
    }
};