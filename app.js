// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const collectionsRoutes = require("./routes/collections");
const booksRoutes = require("./routes/booksRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const reservationsRoutes = require("./routes/reservationsRoutes");
const loansRoutes = require("./routes/adminLoans");
const finesRoutes = require("./routes/finesRoutes");
const likesRoutes = require("./routes/likesRoutes");
const statisticsRoutes = require("./routes/statistics");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use("/images", express.static(path.join(__dirname, "public")));

// Маршрути
app.use("/api/collections", collectionsRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/loans", loansRoutes);
app.use("/api/fines", finesRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/statistics", statisticsRoutes);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер працює на http://localhost:${PORT}`);
});
