const express = require("express");
const router = express.Router();
const {
  getAllCollections,
  getBooksInCollection,
  createCollection,
  deleteCollection,
  updateCollection,
} = require("../controllers/collectionsController");

router.get("/", getAllCollections);
router.get("/:id/books", getBooksInCollection);
router.post("/", createCollection);
router.delete("/:id", deleteCollection);
router.put("/:id", updateCollection);

module.exports = router;
