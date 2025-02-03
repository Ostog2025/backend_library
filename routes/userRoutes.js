const express = require("express");
const router = express.Router();
const {
  updateProfile,
  deleteUser,
  getUserById,
} = require("../controllers/userController");

// Оновлення профілю
router.put("/update-profile", updateProfile);

// Видалення профілю
router.delete("/delete-user", deleteUser);

// Пошук користувача за ID
router.get("/get-user/:userId", getUserById);

module.exports = router;
