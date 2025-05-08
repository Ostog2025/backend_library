const express = require("express");
const router = express.Router();
const {
  getUserLikes,
  addLike,
  removeLike,
} = require("../controllers/likesController");

router.get("/", getUserLikes);
router.post("/", addLike);
router.delete("/:likeid", removeLike);

module.exports = router;
