const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

// Можна встановити зберігання файлів у пам'яті (memory storage), щоб мати доступ до буфера
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  getBooks,
  getBookById,
  addBook,
  editBook,
  deleteBookById,
  searchBooks,
  getFilters,
  getAuthors,
  getPublishers,
  getGenres,
} = require("../controllers/booksController");

router.get("/", getBooks);
router.post("/", upload.single("photo"), addBook);
router.put("/:id", upload.single("photo"), editBook);
router.delete("/id/:id", deleteBookById);
router.get("/authors", getAuthors);
router.get("/publishers", getPublishers);
router.get("/genres", getGenres);
router.get("/search", searchBooks);
router.get("/filters", getFilters);
router.get("/id/:id", getBookById);

module.exports = router;
