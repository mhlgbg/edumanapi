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
            ORDER BY hp.TenHocPhan, khtd.MaNhom
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

    //console.log("addTrainingPlan ", req.body);

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



// Import kế hoạch đào tạo từ file Excel
exports.importTrainingPlans = async (req, res) => {
    //console.log("importTrainingPlans");
    const { HocKiId, Plans } = req.body;
    //console.log("importTrainingPlans plans", Plans);
    //console.log("importTrainingPlans HocKiId", HocKiId);
    if (!HocKiId || !Plans || !Array.isArray(Plans) || Plans.length === 0) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc hoặc danh sách kế hoạch không hợp lệ.' });
    }

    const invalidPlans = [];
    const skippedPlans = [];
    const addedPlans = [];

    try {
        const pool = await poolPromise;
        //console.log("importTrainingPlans Ok");

        for (const plan of Plans) {
            let { MaHocPhan, MaLop, MaNhom } = plan;

            MaNhom = MaNhom ? MaNhom.toString() : null;

            // Kiểm tra thông tin bắt buộc
            if (!MaHocPhan || !MaLop || !MaNhom) {
                invalidPlans.push(plan);
                continue;
            }

            try {
                // Kiểm tra xem kế hoạch đã tồn tại chưa
                const existingPlan = await pool.request()
                    .input('HocKiId', sql.Int, HocKiId)
                    .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
                    .input('MaLop', sql.NVarChar(50), MaLop)
                    .query(`
                        SELECT 1
                        FROM tbk_KeHoachDaoTao
                        WHERE HocKiId = @HocKiId AND MaHocPhan = @MaHocPhan AND MaLop = @MaLop
                    `);

                if (existingPlan.recordset.length > 0) {
                    skippedPlans.push(plan);
                    continue;
                }

                // Thêm kế hoạch đào tạo mới
                await pool.request()
                    .input('HocKiId', sql.Int, HocKiId)
                    .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
                    .input('MaLop', sql.NVarChar(50), MaLop)
                    .input('MaNhom', sql.NVarChar(50), MaNhom)
                    .query(`
                        INSERT INTO tbk_KeHoachDaoTao (HocKiId, MaHocPhan, MaLop, MaNhom)
                        VALUES (@HocKiId, @MaHocPhan, @MaLop, @MaNhom)
                    `);

                addedPlans.push(plan);
            } catch (error) {
                //console.log("importTrainingPlans", error);

                console.error('Error processing plan:', plan, error);
                invalidPlans.push(plan);
            }
        }

        res.status(201).json({
            message: 'Import kế hoạch đào tạo hoàn tất.',
            added: addedPlans,
            skipped: skippedPlans,
            invalid: invalidPlans,
        });
    } catch (error) {
        console.error('Error importing training plans:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình import kế hoạch đào tạo.' });
    }
};

//Tạo lớp học phần từ Kế hoạch đào tạo: học kì hoặc học kì và mã học phần
exports.generateClassesForTrainingPlan = async (req, res) => {
    //console.log();
    const { HocKiId, MaHocPhan } = req.body;

    if (!HocKiId) {
        return res.status(400).json({ message: 'Học kỳ ID là bắt buộc.' });
    }

    try {
        const pool = await poolPromise;
        const condition = MaHocPhan ? 'AND kdt.MaHocPhan = @MaHocPhan' : '';

        const query = `
            SELECT DISTINCT kdt.HocKiId, kdt.MaLop, kdt.MaHocPhan, kdt.MaNhom
            FROM tbk_KeHoachDaoTao kdt
            WHERE kdt.HocKiId = @HocKiId ${condition};
        `;

        const plansResult = await pool.request()
            .input('HocKiId', sql.Int, HocKiId)
            .input('MaHocPhan', sql.NVarChar(50), MaHocPhan || null)
            .query(query);

        const plans = plansResult.recordset;

        if (plans.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy kế hoạch đào tạo phù hợp.' });
        }

        for (const plan of plans) {
            const { HocKiId, MaLop, MaHocPhan, MaNhom } = plan;
            console.log("Trước chèn vào bảng Học phần học kì ", plan);

            // Tính số lượng dự kiến của sinh viên trước
            const result = await pool.request()
                .input('HocKiId', sql.Int, HocKiId)
                .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
                .query(`
                SELECT COUNT(*) AS SoLuongDuKienHoc
                FROM qlsv_SinhVienLopChuyenNganh lcn
                JOIN SinhVien sv ON lcn.MaSinhVien = sv.MaSinhVien
                JOIN tbk_KeHoachDaoTao kdt ON lcn.MaLopChuyenNganh = kdt.MaLop
                WHERE kdt.HocKiId = @HocKiId AND kdt.MaHocPhan = @MaHocPhan AND sv.TinhTrang = 'BT'
            `);

            const soLuongDuKienHoc = result.recordset[0]?.SoLuongDuKienHoc || 0;

            // Tính số lớp dự kiến mở
            const lopDuKienResult = await pool.request()
                .input('HocKiId', sql.Int, HocKiId)
                .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
                .query(`
                    SELECT COUNT(DISTINCT kdt.MaNhom) AS SoLopDuKienMo
                    FROM tbk_KeHoachDaoTao kdt
                    WHERE kdt.HocKiId = @HocKiId AND kdt.MaHocPhan = @MaHocPhan
                `);

            const soLopDuKienMo = lopDuKienResult.recordset[0]?.SoLopDuKienMo || 0;

            // Thêm vào bảng HocPhanHocKi nếu chưa tồn tại
            await pool.request()
                .input('HocKiId', sql.Int, HocKiId)
                .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
                .input('SoLuongDuKienHoc', sql.Int, soLuongDuKienHoc)
                .input('SoLopDuKienMo', sql.Int, soLopDuKienMo)
                .query(`
                IF NOT EXISTS (
                    SELECT 1 FROM HocPhanHocKi hphk
                    WHERE hphk.HocKiId = @HocKiId AND hphk.MaHocPhan = @MaHocPhan
                )
                INSERT INTO HocPhanHocKi (HocKiId, MaHocPhan, SoLuongDuKienHoc, SoLopDuKienMo, TinhTrang)
                VALUES (@HocKiId, @MaHocPhan, @SoLuongDuKienHoc, @SoLopDuKienMo, 'S');
            `);
            console.log("Chèn vào bảng Học phần học kì xong");
            // Thêm vào bảng tkb_LopHocPhanHocKi nếu chưa tồn tại
            const lopHocPhanResult = await pool.request()
                .input('HocKiId', sql.Int, HocKiId)
                .input('MaHocPhan', sql.NVarChar(50), MaHocPhan)
                .input('TenLop', sql.NVarChar(50), `${MaHocPhan}_${MaNhom}`)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM tkb_LopHocPhanHocKi lhhk
                        WHERE lhhk.HocKiId = @HocKiId AND lhhk.TenLop = @TenLop
                    )
                    INSERT INTO tkb_LopHocPhanHocKi (HocKiId, MaHocPhan, TenLop, SoLopTach, TinhTrang, SoLuongToiDa)
                    VALUES (@HocKiId, @MaHocPhan, @TenLop, 0, 'S', 100);

                    SELECT lhhk.LopHocPhanHocKiId
                    FROM tkb_LopHocPhanHocKi lhhk
                    WHERE lhhk.HocKiId = @HocKiId AND lhhk.TenLop = @TenLop;
                `);
            const LopHocPhanHocKiId = lopHocPhanResult.recordset[0]?.LopHocPhanHocKiId;
            

            if (!LopHocPhanHocKiId) {
                throw new Error(`Không thể tạo hoặc tìm thấy LopHocPhanHocKiId cho lớp: ${MaHocPhan}_${MaNhom}`);
            }

            // Thêm sinh viên vào các bảng liên quan
            const sinhVienQuery = `
                SELECT DISTINCT sv.MaSinhVien
                FROM qlsv_SinhVienLopChuyenNganh lcn
                JOIN SinhVien sv ON lcn.MaSinhVien = sv.MaSinhVien
                WHERE lcn.MaLopChuyenNganh = @MaLop AND sv.TinhTrang = 'BT';
            `;
            const sinhVienResult = await pool.request()
                .input('MaLop', sql.NVarChar(50), MaLop)
                .query(sinhVienQuery);
            
            for (const sinhVien of sinhVienResult.recordset) {
                const { MaSinhVien } = sinhVien;

                // Thêm vào bảng tkb_SinhVienLopHocPhanHocTrongKi nếu chưa tồn tại
                
                await pool.request()
                    .input('LopHocPhanHocTrongKiId', sql.Int, LopHocPhanHocKiId)
                    .input('MaSinhVien', sql.NVarChar(50), MaSinhVien)
                    .query(`
                        IF NOT EXISTS (
                            SELECT 1 FROM tkb_SinhVienLopHocPhanHocTrongKi svlhp
                            WHERE svlhp.LopHocPhanHocTrongKiId = @LopHocPhanHocTrongKiId AND svlhp.MaSinhVien = @MaSinhVien
                        )
                        INSERT INTO tkb_SinhVienLopHocPhanHocTrongKi (LopHocPhanHocTrongKiId, MaSinhVien, TinhTrang, IsLocked, ThoiDiemCapNhat, NguoiTao)
                        VALUES (@LopHocPhanHocTrongKiId, @MaSinhVien, 'BT', 0, GETDATE(), 'System');
                    `);
                console.log("Thêm xong sinh viên ", MaSinhVien);


                // Thêm vào bảng tkb_SinhVienHocPhanHocKi nếu chưa tồn tại
                await pool.request()
                    .input('HocKiId', sql.Int, HocKiId)
                    .input('MaSinhVien', sql.NVarChar(50), MaSinhVien)
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
        }

        res.status(200).json({ message: 'Tạo lớp học phần thành công.' });
    } catch (error) {
        console.error('Error generating classes for training plan:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi tạo lớp học phần.' });
    }
};

