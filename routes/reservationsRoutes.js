const express = require("express");
const {
  getUserReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation,
  cancelReservation,
} = require("../controllers/reservationController");

const router = express.Router();

router.get("/", getUserReservations);
router.post("/", createReservation);
router.put("/status", updateReservationStatus);
router.patch("/:reservationId", cancelReservation);
router.delete("/:reservationId", deleteReservation);

module.exports = router;
