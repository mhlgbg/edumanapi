const path = require('path');
const ExcelJS = require('exceljs');
const { poolPromise, sql } = require('../dbConfig');

// In thông tin các ô trong một dòng
function logMergeInfo(worksheet, rowNumber) {
    console.log(`Checking merge info for row ${rowNumber}:`);
    const cellsToCheck = ['B', 'C', 'D', 'E', 'F'];

    cellsToCheck.forEach((col) => {
        const cell = worksheet.getCell(`${col}${rowNumber}`);
        const isMerged = worksheet._merges.some((range) =>
            range.includes(cell.address)
        );
        console.log(`Cell ${col}${rowNumber}: merged=${isMerged}`);
    });
}

function logMergeInfo1(worksheet, rowNumber) {
    console.log(`Checking merge info for row ${rowNumber}:`);
    const cellsToCheck = ['B', 'C', 'D', 'E', 'F'];

    // Log toàn bộ vùng merge trong worksheet
    console.log("All merge ranges in worksheet:", worksheet._merges);

    cellsToCheck.forEach((col) => {
        const cell = worksheet.getCell(`${col}${rowNumber}`);
        const isMerged = worksheet._merges.some((range) =>
            range.includes(cell.address)
        );
        console.log(`Cell ${col}${rowNumber}: merged=${isMerged}`);
    });
}

function isCellMerged(worksheet, cellAddress) {
    const merges = Object.values(worksheet._merges).map(merge => merge.model);
    return merges.some(merge =>
        merge.top <= worksheet.getCell(cellAddress).row &&
        merge.bottom >= worksheet.getCell(cellAddress).row &&
        merge.left <= worksheet.getCell(cellAddress).col &&
        merge.right >= worksheet.getCell(cellAddress).col
    );
}

function logMergeInfo2(worksheet, rowNumber) {
    console.log(`Checking merge info for row ${rowNumber}:`);
    const cellsToCheck = ['B', 'C', 'D', 'E', 'F'];

    cellsToCheck.forEach((col) => {
        const cellAddress = `${col}${rowNumber}`;
        const merged = isCellMerged(worksheet, cellAddress);
        console.log(`Cell ${cellAddress}: merged=${merged}`);
    });
}

exports.exportStudenScoreToExcel = async (req, res) => {
    console.log("exportStudenScoreToExcel");
    try {
        const { studentInfo, scores } = req.body;

        // Đường dẫn file mẫu
        const templatePath = path.join(__dirname, '../excel_template/bangdiemcanhan.xlsx');

        // Load file Excel mẫu
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);

        // Lấy sheet đầu tiên
        const worksheet = workbook.getWorksheet(1);
        logMergeInfo2(worksheet, 10);


        // Điền thông tin sinh viên
        worksheet.getCell('C4').value = `${studentInfo.HoDem} ${studentInfo.Ten}`;
        worksheet.getCell('C5').value = new Date(studentInfo.NgaySinh).toLocaleDateString('vi-VN');
        worksheet.getCell('C6').value = studentInfo.MaSinhVien;
        worksheet.getCell('C7').value = studentInfo.MaLopChuyenNganh;
        worksheet.getCell('J4').value = studentInfo.TenNganh;
        worksheet.getCell('J5').value = studentInfo.KhoaHoc;
        worksheet.getCell('J7').value = studentInfo.TenKhoaHe;

        // Dòng bắt đầu điền điểm
        let startRow = 10;
        const sourceRow = worksheet.getRow(10);

        scores.forEach((score, index) => {
            const currentRow = startRow + index;

            if (index > 0) {
                worksheet.insertRow(currentRow, []);
            }

            // Kiểm tra và merge cột B:F nếu chưa merge
            if (!isCellMerged(worksheet, `B${currentRow}`)) {
                worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
            }

            const row = worksheet.getRow(currentRow);
            const sourceRow = worksheet.getRow(10);

            // Sao chép định dạng từ dòng 10
            row.height = sourceRow.height;
            sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const targetCell = row.getCell(colNumber);
                targetCell.style = { ...cell.style }; // Sao chép style
            });

            // Điền dữ liệu
            row.getCell(1).value = score.STT;
            row.getCell(2).value = score.TenHocPhan;
            row.getCell(7).value = score.SoTinChi;
            row.getCell(8).value = score.DiemHe10;
            row.getCell(9).value = score.DiemChu;
            row.getCell(10).value = score.DiemHe4;

            row.commit();
        });
        const currentDate = new Date();

        const summaryStartRow = startRow + scores.length; // Giả sử các dòng đã có sẵn trong mẫu
        worksheet.getCell(`D${summaryStartRow}`).value = studentInfo.TongTinChiTichLuy;
        worksheet.getCell(`I${summaryStartRow}`).value = `Hà Nội, ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`;
        worksheet.getCell(`D${summaryStartRow + 1}`).value = studentInfo.TrungBinhTichLuy;

        // Ghi file Excel tạm thời và gửi về client
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=BangDiem_${studentInfo.MaSinhVien}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting Excel:', error);
        res.status(500).json({ message: 'Lỗi khi xuất Excel' });
    }
};


// API xuất thời khóa biểu ra Excel

/*exports.exportScheduleToExcel = async (req, res) => {
    console.log("exportScheduleToExcel", req.query);
    try {
        const { HocKiId } = req.query;

        if (!HocKiId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp HocKiId' });
        }

        // Đường dẫn file mẫu
        const templatePath = path.join(__dirname, '../excel_template/thoikhoabieu.xlsx');

        // Load file Excel mẫu
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet(1);

        const pool = await poolPromise;
        const result = await pool.request()
            .input('HocKiId', HocKiId)
            .query(`
                SELECT 
                    ns.MaNhanhSu AS MaGiangVien,
                    CONCAT(ns.HoDem, ' ', ns.Ten) AS HoVaTen,
                    tkb.ThuTrongTuan,
                    CONCAT(gh_start.ThuTuGioTrongNgay, '-', gh_end.ThuTuGioTrongNgay) AS TietHoc,
                    CONCAT(FORMAT(gh_start.ThoiDiemBatDau / 60, '00'), ':', FORMAT(gh_start.ThoiDiemBatDau % 60, '00'),
                           '-', FORMAT(gh_end.ThoiDiemKetThuc / 60, '00'), ':', FORMAT(gh_end.ThoiDiemKetThuc % 60, '00')) AS ThoiGian,
                    tkb.SoHieuPhong,
                    lhp.TenLop AS MHP_Lop,
                    hp.TenHocPhan,
                    hp.SoTinChi,
                    STRING_AGG(kh.MaLop, ', ') AS TenLop,
                    COUNT(DISTINCT sv.MaSinhVien) AS SoSinhVien,
                    tkb.TuNgay,
                    tkb.DenNgay
                FROM tkb_ThoiKhoaBieu tkb
                INNER JOIN tkb_LopHocPhanHocKi lhp ON tkb.LopHocPhanHocKiId = lhp.LopHocPhanHocKiId
                INNER JOIN HocPhan hp ON lhp.MaHocPhan = hp.MaHocPhan
                INNER JOIN NhanSu ns ON tkb.MaNhanSu = ns.MaNhanhSu
                INNER JOIN tkb_GioHoc gh_start ON tkb.GioBatDauId = gh_start.GioHocId
                INNER JOIN tkb_GioHoc gh_end ON tkb.GioKetThucId = gh_end.GioHocId
                LEFT JOIN tbk_KeHoachDaoTao kh ON kh.MaHocPhan = hp.MaHocPhan AND kh.HocKiId = @HocKiId
                LEFT JOIN tkb_SinhVienLopHocPhanHocTrongKi sv ON sv.LopHocPhanHocTrongKiId = tkb.ThoiKhoaBieuId
                WHERE lhp.HocKiId = @HocKiId
                GROUP BY 
                    ns.MaNhanhSu, ns.HoDem, ns.Ten, tkb.ThuTrongTuan, gh_start.ThuTuGioTrongNgay, gh_end.ThuTuGioTrongNgay,
                    gh_start.ThoiDiemBatDau, gh_end.ThoiDiemKetThuc, tkb.SoHieuPhong, lhp.TenLop, hp.TenHocPhan, hp.SoTinChi,
                    tkb.TuNgay, tkb.DenNgay
                ORDER BY ns.MaNhanhSu, tkb.ThuTrongTuan, gh_start.ThuTuGioTrongNgay
            `);

        const schedules = result.recordset;

        if (schedules.length === 0) {
            return res.status(404).json({ message: 'Không có dữ liệu thời khóa biểu cho học kỳ này' });
        }

        // Ghi dữ liệu vào Excel
        let startRow = 7;
        const sourceRow = worksheet.getRow(startRow);

        schedules.forEach((schedule, index) => {
            const currentRow = startRow + index;
            if (index > 0) {
                worksheet.insertRow(currentRow, []); // Thêm dòng mới
            }
            const row = worksheet.getRow(currentRow);

            // Sao chép định dạng
            sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const targetCell = row.getCell(colNumber);
                targetCell.style = { ...cell.style };
            });

            // Điền dữ liệu
            row.getCell(1).value = index + 1; // STT
            row.getCell(2).value = schedule.ThuTrongTuan === 8 ? 'CN' : `Thứ ${schedule.ThuTrongTuan}`; // Thứ
            row.getCell(3).value = schedule.SoHieuPhong; // Phòng
            row.getCell(4).value = schedule.TietHoc; // Tiết
            row.getCell(5).value = schedule.ThoiGian; // Thời gian
            row.getCell(6).value = schedule.MHP_Lop; // MHP_Lớp
            row.getCell(7).value = schedule.TenHocPhan; // Tên học phần
            row.getCell(8).value = schedule.SoTinChi; // Số tín chỉ
            row.getCell(9).value = schedule.TenLop; // Tên lớp
            row.getCell(10).value = schedule.SoSinhVien; // Số sinh viên
            row.getCell(11).value = `${schedule.MaGiangVien} - ${schedule.HoVaTen}`; // Giảng viên
            row.getCell(12).value = new Date(schedule.TuNgay).toLocaleDateString('vi-VN'); // Từ ngày
            row.getCell(13).value = new Date(schedule.DenNgay).toLocaleDateString('vi-VN'); // Đến ngày

            row.commit(); // Lưu thay đổi
        });

        // Ghi file Excel và gửi về client
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Thoikhoabieu_HocKi_${HocKiId}.xlsx`
        );
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting schedule to Excel:', error);
        res.status(500).json({ message: 'Lỗi khi xuất thời khóa biểu' });
    }
};
*/

exports.exportScheduleToExcel = async (req, res) => {
    console.log("exportScheduleToExcel", req.query);
    try {
        const { HocKiId } = req.query;

        if (!HocKiId) {
            return res.status(400).json({ message: 'Vui lòng cung cấp HocKiId' });
        }

        // Đường dẫn file mẫu
        const templatePath = path.join(__dirname, '../excel_template/thoikhoabieu.xlsx');

        // Load file Excel mẫu
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet(1);

        const pool = await poolPromise;
        const result = await pool.request()
            .input('HocKiId', HocKiId)
            .query(`
                -- Tạo bảng tạm để lưu dữ liệu
                CREATE TABLE #ThoiKhoaBieuOutput (
                    MaGiangVien NVARCHAR(50),
                    HoVaTen NVARCHAR(100),
                    ThuTrongTuan INT,
                    TietHoc NVARCHAR(50),
                    ThoiGian NVARCHAR(50),
                    SoHieuPhong NVARCHAR(50),
                    MHP_Lop NVARCHAR(50),
                    TenHocPhan NVARCHAR(250),
                    SoTinChi FLOAT,
                    TenLop NVARCHAR(MAX),
                    SoSinhVien INT,
                    TuNgay DATE,
                    DenNgay DATE
                );

                -- Khai báo con trỏ để duyệt bảng tkb_ThoiKhoaBieu
                DECLARE curThoiKhoaBieu CURSOR FOR
                SELECT 
                    tkb.ThoiKhoaBieuId,
                    tkb.LopHocPhanHocKiId,
                    tkb.MaNhanSu,
                    tkb.ThuTrongTuan,
                    tkb.GioBatDauId,
                    tkb.GioKetThucId,
                    tkb.SoHieuPhong,
                    tkb.TuNgay,
                    tkb.DenNgay
                FROM tkb_ThoiKhoaBieu tkb
                WHERE tkb.LopHocPhanHocKiId IN (
                    SELECT LopHocPhanHocKiId FROM tkb_LopHocPhanHocKi WHERE HocKiId = @HocKiId
                ) order by tkb.ThuTrongTuan;

                -- Biến tạm để lưu giá trị của mỗi dòng
                DECLARE @ThoiKhoaBieuId INT,
                        @LopHocPhanHocKiId INT,
                        @MaNhanSu NVARCHAR(50),
                        @ThuTrongTuan INT,
                        @GioBatDauId INT,
                        @GioKetThucId INT,
                        @SoHieuPhong NVARCHAR(50),
                        @TuNgay DATE,
                        @DenNgay DATE;

                -- Mở con trỏ
                OPEN curThoiKhoaBieu;

                -- Lặp qua từng dòng
                FETCH NEXT FROM curThoiKhoaBieu INTO 
                    @ThoiKhoaBieuId, @LopHocPhanHocKiId, @MaNhanSu, @ThuTrongTuan, 
                    @GioBatDauId, @GioKetThucId, @SoHieuPhong, @TuNgay, @DenNgay;

                WHILE @@FETCH_STATUS = 0
                BEGIN
                    -- Lấy thông tin giảng viên
                    DECLARE @HoVaTen NVARCHAR(100);
                    SELECT @HoVaTen = CONCAT(HoDem, ' ', Ten)
                    FROM NhanSu
                    WHERE MaNhanhSu = @MaNhanSu;

                    -- Lấy tiết học và thời gian
                    DECLARE @TietHoc NVARCHAR(50), @ThoiGian NVARCHAR(50);
                    SELECT 
                        @TietHoc = CONCAT(gh_start.ThuTuGioTrongNgay, '-', gh_end.ThuTuGioTrongNgay),
                        @ThoiGian = CONCAT(
                            FORMAT(gh_start.ThoiDiemBatDau / 60, '00'), ':', FORMAT(gh_start.ThoiDiemBatDau % 60, '00'),
                            '-', FORMAT(gh_end.ThoiDiemKetThuc / 60, '00'), ':', FORMAT(gh_end.ThoiDiemKetThuc % 60, '00')
                        )
                    FROM tkb_GioHoc gh_start
                    INNER JOIN tkb_GioHoc gh_end ON gh_end.GioHocId = @GioKetThucId
                    WHERE gh_start.GioHocId = @GioBatDauId;

                    -- Lấy thông tin lớp học phần
                    DECLARE @MHP_Lop NVARCHAR(50), @TenHocPhan NVARCHAR(250), @SoTinChi FLOAT;
                    SELECT 
                        @MHP_Lop = lhp.TenLop,
                        @TenHocPhan = hp.TenHocPhan,
                        @SoTinChi = hp.SoTinChi
                    FROM tkb_LopHocPhanHocKi lhp
                    INNER JOIN HocPhan hp ON lhp.MaHocPhan = hp.MaHocPhan
                    WHERE lhp.LopHocPhanHocKiId = @LopHocPhanHocKiId;

                -- Lấy thông tin các lớp
                DECLARE @TenLop NVARCHAR(MAX);
                SELECT @TenLop = STUFF((
                    SELECT DISTINCT ', ' + kh.MaLop
                    FROM tbk_KeHoachDaoTao kh
                    WHERE kh.MaHocPhan = (
                        SELECT MaHocPhan FROM tkb_LopHocPhanHocKi WHERE LopHocPhanHocKiId = @LopHocPhanHocKiId
                    )
                    AND kh.HocKiId = @HocKiId
                    FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '');

                    -- Đếm số sinh viên
                    DECLARE @SoSinhVien INT;
                    SELECT @SoSinhVien = COUNT(DISTINCT sv.MaSinhVien)
                    FROM tkb_SinhVienLopHocPhanHocTrongKi sv
                    WHERE sv.LopHocPhanHocTrongKiId = @ThoiKhoaBieuId;

                    -- Chèn dữ liệu vào bảng tạm
                    INSERT INTO #ThoiKhoaBieuOutput
                    VALUES (
                        @MaNhanSu, @HoVaTen, @ThuTrongTuan, @TietHoc, @ThoiGian, 
                        @SoHieuPhong, @MHP_Lop, @TenHocPhan, @SoTinChi, @TenLop, 
                        @SoSinhVien, @TuNgay, @DenNgay
                    );

                    -- Tiếp tục với dòng tiếp theo
                    FETCH NEXT FROM curThoiKhoaBieu INTO 
                        @ThoiKhoaBieuId, @LopHocPhanHocKiId, @MaNhanSu, @ThuTrongTuan, 
                        @GioBatDauId, @GioKetThucId, @SoHieuPhong, @TuNgay, @DenNgay;
                END

                -- Đóng và giải phóng con trỏ
                CLOSE curThoiKhoaBieu;
                DEALLOCATE curThoiKhoaBieu;

                -- Trả dữ liệu từ bảng tạm
                SELECT * FROM #ThoiKhoaBieuOutput;

                -- Xóa bảng tạm
                DROP TABLE #ThoiKhoaBieuOutput;

            `);

        const schedules = result.recordset;

        if (schedules.length === 0) {
            return res.status(404).json({ message: 'Không có dữ liệu thời khóa biểu cho học kỳ này' });
        }

        // Ghi dữ liệu vào Excel
        let startRow = 7;
        const sourceRow = worksheet.getRow(startRow);

        schedules.forEach((schedule, index) => {
            const currentRow = startRow + index;
            if (index > 0) {
                worksheet.insertRow(currentRow, []); // Thêm dòng mới
            }
            const row = worksheet.getRow(currentRow);

            // Sao chép định dạng
            sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const targetCell = row.getCell(colNumber);
                targetCell.style = { ...cell.style };
            });

            // Điền dữ liệu
            //row.getCell(1).value = index + 1; // STT
            row.getCell(1).value = (() => {
                switch (schedule.ThuTrongTuan) {
                    case 2: return 'Hai';
                    case 3: return 'Ba';
                    case 4: return 'Tư';
                    case 5: return 'Năm';
                    case 6: return 'Sáu';
                    case 7: return 'Bảy';
                    case 8: return 'CN';
                    default: return 'Không xác định';
                }
            })();
            row.getCell(3).value = schedule.SoHieuPhong; // Phòng
            row.getCell(4).value = schedule.TietHoc; // Tiết
            row.getCell(5).value = schedule.ThoiGian; // Thời gian
            row.getCell(6).value = schedule.MHP_Lop; // MHP_Lớp
            row.getCell(7).value = schedule.TenHocPhan; // Tên học phần
            row.getCell(8).value = schedule.SoTinChi; // Số tín chỉ
            row.getCell(9).value = schedule.TenLop; // Tên lớp
            row.getCell(10).value = schedule.SoSinhVien; // Số sinh viên
            row.getCell(11).value = `${schedule.MaGiangVien} - ${schedule.HoVaTen}`; // Giảng viên
            row.getCell(12).value = new Date(schedule.TuNgay).toLocaleDateString('vi-VN'); // Từ ngày
            row.getCell(13).value = new Date(schedule.DenNgay).toLocaleDateString('vi-VN'); // Đến ngày

            row.commit(); // Lưu thay đổi
        });
        // Thêm dòng cuối cùng với thông tin ngày tháng năm
        const currentDate = new Date();
        const lastRow = startRow + schedules.length;
        worksheet.getCell(`K${lastRow + 1}`).value = `Hà Nội, ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`;
        worksheet.getCell(`K${lastRow + 1}`).alignment = { horizontal: 'left', vertical: 'middle' }; // Căn chỉnh nội dung

        // Ghi file Excel và gửi về client
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Thoikhoabieu_HocKi_${HocKiId}.xlsx`
        );
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting schedule to Excel:', error);
        res.status(500).json({ message: 'Lỗi khi xuất thời khóa biểu' });
    }
};

