const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
  getTopBooks,
  getTopUsers,
  getTopGenres,
  exportBooksToCSV,
  importBooksFromCSV,
  getMonthlyLoans,
  getBooksWithFewestCopies,
  getBooksToRestock,
  getAverageCopiesPerBook,
} = require("../controllers/statisticsController");

router.get("/top-books", getTopBooks);
router.get("/top-users", getTopUsers);
router.get("/top-genres", getTopGenres);
router.get("/monthly-loans", getMonthlyLoans);
router.get("/fewest-copies", getBooksWithFewestCopies);
router.get("/restock-books", getBooksToRestock);
router.get("/average-copies", getAverageCopiesPerBook);
router.get("/export-books", exportBooksToCSV);
router.post("/import-books", upload.single("file"), importBooksFromCSV);

module.exports = router;
