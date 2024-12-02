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

exports.getSemesterDetails = async (req, res) => {
    const { semesterId } = req.params;
  
    if (!semesterId) {
      return res.status(400).json({ message: 'Semester ID is required' });
    }
  
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('HocKiId', sql.Int, semesterId)
        .query(`
          SELECT HocKiId, NgayBatDauHocKi, NgayKetThucHocKi, TenHienThi
          FROM HocKi
          WHERE HocKiId = @HocKiId
        `);
  
      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Semester not found' });
      }
  
      res.status(200).json(result.recordset[0]);
    } catch (error) {
      console.error('Error fetching Semester Details:', error);
      res.status(500).json({ message: 'Error fetching Semester Details' });
    }
  };
  