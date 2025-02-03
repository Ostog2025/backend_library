const express = require("express");
const {
  getUserReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation,
} = require("../controllers/reservationController");

const router = express.Router();

router.get("/:userId", getUserReservations);

router.post("/", createReservation);

router.put("/status", updateReservationStatus);

router.delete("/:reservationId", deleteReservation);

module.exports = router;
