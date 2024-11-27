const { poolPromise, sql } = require('../dbConfig');


// Lấy danh sách kế hoạch đào tạo
// Lấy danh sách kế hoạch đào tạo
exports.getTrainingPlans = async (req, res) => {
    const { HocKiId, keyword } = req.query;

    if (!HocKiId) {
        return res.status(400).json({ message: 'Học kỳ không được để trống.' });
    }

    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('HocKiId', sql.Int, HocKiId);

        // Thêm logic tìm kiếm theo từ khóa
        let searchCondition = '';
        if (keyword) {
            request.input('keyword', sql.NVarChar, `%${keyword}%`);
            searchCondition = `
                AND (
                    hp.MaHocPhan LIKE @keyword OR
                    hp.TenHocPhan LIKE @keyword OR 
                    lcn.TenLopChuyenNganh LIKE @keyword
                )
            `;
        }

        const query = `
            SELECT 
                khtd.Id,
                khtd.HocKiId,
                khtd.MaHocPhan,
                hp.TenHocPhan,
                khtd.MaLop,
                lcn.TenLopChuyenNganh AS TenLop,
                khtd.MaNhom
            FROM tbk_KeHoachDaoTao khtd
            INNER JOIN HocPhan hp ON khtd.MaHocPhan = hp.MaHocPhan
            INNER JOIN LopChuyenNganh lcn ON khtd.MaLop = lcn.MaLopChuyenNganh
            WHERE khtd.HocKiId = @HocKiId
            ${searchCondition}
            ORDER BY hp.TenHocPhan, lcn.TenLopChuyenNganh
        `;

        const result = await request.query(query);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching training plans:', error);
        res.status(500).json({ message: 'Error fetching training plans' });
    }
};



// Thêm mới kế hoạch đào tạo
exports.addTrainingPlan = async (req, res) => {
    const { HocKiId, MaHocPhan, MaLop, MaNhom } = req.body;
    console.log("addTrainingPlan ", req.body);

    if (!HocKiId || !MaHocPhan || !MaLop || !MaNhom) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('HocKiId', sql.Int, HocKiId)
            .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
            .input('MaLop', sql.NVarChar(50), MaLop)
            .input('MaNhom', sql.NVarChar(50), MaNhom)
            .query(`
                INSERT INTO tbk_KeHoachDaoTao (HocKiId, MaHocPhan, MaLop, MaNhom)
                VALUES (@HocKiId, @MaHocPhan, @MaLop, @MaNhom)
            `);
        res.status(201).json({ message: 'Thêm kế hoạch đào tạo thành công.' });
    } catch (error) {
        console.error('Error adding training plan:', error);
        res.status(500).json({ message: 'Error adding training plan' });
    }
};

// Thêm lớp vào môn học
exports.addClassToSubject = async (req, res) => {
    const { MaHocPhan, MaLop, MaNhom } = req.body;

    if (!MaHocPhan || !MaLop || !MaNhom) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
            .input('MaLop', sql.NVarChar(50), MaLop)
            .input('MaNhom', sql.NVarChar(50), MaNhom)
            .query(`
                INSERT INTO tbk_KeHoachDaoTao (HocKiId, MaHocPhan, MaLop, MaNhom)
                VALUES (
                    (SELECT TOP 1 HocKiId FROM tbk_KeHoachDaoTao WHERE MaHocPhan = @MaHocPhan),
                    @MaHocPhan, @MaLop, @MaNhom
                )
            `);
        res.status(201).json({ message: 'Thêm lớp vào môn học thành công.' });
    } catch (error) {
        console.error('Error adding class to subject:', error);
        res.status(500).json({ message: 'Error adding class to subject' });
    }
};

// Xóa lớp khỏi kế hoạch đào tạo
exports.deleteTrainingPlan = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'Id không được để trống.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                DELETE FROM tbk_KeHoachDaoTao WHERE Id = @Id
            `);
        res.status(200).json({ message: 'Xóa lớp thành công.' });
    } catch (error) {
        console.error('Error deleting training plan:', error);
        res.status(500).json({ message: 'Error deleting training plan' });
    }
};

// Xóa môn học và các lớp liên quan
exports.deleteSubject = async (req, res) => {
    const { MaHocPhan } = req.params;

    if (!MaHocPhan) {
        return res.status(400).json({ message: 'Mã học phần không được để trống.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
            .query(`
                DELETE FROM tbk_KeHoachDaoTao WHERE MaHocPhan = @MaHocPhan
            `);
        res.status(200).json({ message: 'Xóa môn học và các lớp liên quan thành công.' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ message: 'Error deleting subject' });
    }
};

// API lấy danh sách tất cả học phần
exports.getAllHocPhan = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT MaHocPhan, MaHocPhan + ' - ' + TenHocPhan as TenHocPhan
                FROM HocPhan
                --WHERE TinhTrang = 'active'
            `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching all HocPhan:', error);
        res.status(500).json({ message: 'Error fetching all HocPhan' });
    }
};

// API lấy danh sách tất cả lớp chuyên ngành
exports.getAllLopChuyenNganh = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT MaLopChuyenNganh, TenLopChuyenNganh
                FROM LopChuyenNganh
                ORDER BY TenLopChuyenNganh ASC -- Sắp xếp theo tên lớp
            `);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error fetching all LopChuyenNganh:', error);
        res.status(500).json({ message: 'Error fetching all LopChuyenNganh' });
    }
};