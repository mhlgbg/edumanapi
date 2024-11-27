const express = require('express');
const path = require('path');

const reportRoutes = require('./reportController'); // Import route
const userRoutes = require('./routes/userRoutes'); // Import route
const studyRoutes = require('./routes/studyRoutes'); // Import route
const exportRoutes = require('./routes/exportRoutes'); // Import route

const semesterRoutes = require('./routes/semesterRoutes'); // Import route
const trainingPlanRoutes = require('./routes/trainingPlanRoutes'); // Import route


require('dotenv').config();


const cors = require('cors'); // Import CORS
const ExcelJS = require('exceljs'); // Import ExcelJS

const app = express();
app.use(express.json());
app.use(cors()); // Cho phép tất cả các origin

app.use(reportRoutes); // Sử dụng route báo cáo
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.use('/api/users', userRoutes);
app.use('/api/studies', studyRoutes);
app.use('/api/exports', exportRoutes);

app.use('/api/semesters', semesterRoutes);
app.use('/api/training-plans', trainingPlanRoutes);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});



