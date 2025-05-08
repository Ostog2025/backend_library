const express = require("express");
const {
  getActiveLoans,
  getLoanHistory,
  sendReturnReminders,
  adminCreateReservation,
} = require("../controllers/loanController");

const router = express.Router();

router.get("/active", getActiveLoans);
router.get("/history", getLoanHistory);
router.post("/remind", sendReturnReminders);
router.post("/reservations", adminCreateReservation);

module.exports = router;
