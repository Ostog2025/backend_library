const express = require("express");
const router = express.Router();
const {
  getUsers,
  updateProfile,
  updateUserByAdmin,
  deleteUser,
  getUserByToken,
} = require("../controllers/userController");
const { authenticateToken, checkIsAdmin } = require("../middlewares/auth");

router.get("/get-users", getUsers);
router.put("/update-profile", updateProfile);
router.put(
  "/admin-update-user",
  authenticateToken,
  checkIsAdmin,
  updateUserByAdmin
);
router.delete("/delete-user", deleteUser);
router.get("/me", getUserByToken);

module.exports = router;
