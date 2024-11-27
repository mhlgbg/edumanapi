const path = require('path');
const ExcelJS = require('exceljs');

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
        worksheet.getCell(`D${summaryStartRow+1}`).value = studentInfo.TrungBinhTichLuy;

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
