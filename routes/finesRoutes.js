const express = require("express");
const {
  getUserFines,
  addFine,
  getTotalUserFines,
  deleteFine,
} = require("../controllers/finesController");

const router = express.Router();

router.get("/:userId", getUserFines);

router.get("/total/:userId", getTotalUserFines);

router.post("/", addFine);

router.delete("/:fineId", deleteFine);

module.exports = router;
