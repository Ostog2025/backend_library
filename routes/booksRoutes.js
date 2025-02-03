const express = require("express");
const router = express.Router();
const {
  getBooks,
  getBookById,
  deleteBookById,
  searchBooks,
  getFilters,
} = require("../controllers/booksController");

router.get("/", getBooks);

router.get("/id/:id", getBookById);

router.delete("/id/:id", deleteBookById);

router.get("/search", searchBooks);

router.get("/filters", getFilters);

module.exports = router;
