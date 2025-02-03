const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const client = require("../db/db");

// Реєстрація нового користувача
exports.register = async (req, res) => {
  const { username, password, email, firstName, lastName, phone } = req.body;

  try {
    // Перевірка чи вже є така пошта
    const checkUserQuery =
      "SELECT * FROM Users WHERE Username = $1 OR Email = $2";
    const result = await client.query(checkUserQuery, [username, email]);

    if (result.rows.length > 0) {
      return res.status(400).json({ message: "Користувач вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUserQuery = `
      INSERT INTO Users (Username, PasswordHash, Email, FirstName, LastName, Phone, RegistrationDate)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())`;
    await client.query(insertUserQuery, [
      username,
      hashedPassword,
      email,
      firstName,
      lastName,
      phone,
    ]);

    res.status(201).json({ message: "Користувача зареєстровано успішно" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Вхід в профіль
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await client.query(
      "SELECT * FROM Users WHERE Username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Користувача не знайдено" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.passwordhash);

    if (!isMatch) {
      return res.status(400).json({ message: "Невірні облікові дані" });
    }

    const token = jwt.sign({ userId: user.userid }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
