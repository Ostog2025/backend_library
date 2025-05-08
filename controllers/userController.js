require("dotenv").config();
const client = require("../db/db");
const jwt = require("jsonwebtoken");

// Пошук даних
exports.getUserByToken = async (req, res) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Токен відсутній або некоректний" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token received:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log("Decoded User ID:", userId);

    const query = `
      SELECT userid, username, email, firstname, lastname, phone, registrationdate
      FROM public.users
      WHERE userid = $1;
    `;
    const result = await client.query(query, [userId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Користувача не знайдено" });
    }
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Недійсний або прострочений токен" });
  }
};

// Отримання списку всіх користувачів
exports.getUsers = async (req, res) => {
  try {
    const query = "SELECT * FROM Users";
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

exports.updateUserByAdmin = async (req, res) => {
  const {
    userId,
    username,
    email,
    firstname,
    lastname,
    phone,
    isblocked,
    isadmin,
  } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "Не вказано ID користувача" });
  }
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (username !== undefined) {
      fields.push(`Username = $${idx++}`);
      values.push(username);
    }
    if (email !== undefined) {
      fields.push(`Email = $${idx++}`);
      values.push(email);
    }
    if (firstname !== undefined) {
      fields.push(`firstname = $${idx++}`);
      values.push(firstname);
    }
    if (lastname !== undefined) {
      fields.push(`lastname = $${idx++}`);
      values.push(lastname);
    }
    if (phone !== undefined) {
      fields.push(`Phone = $${idx++}`);
      values.push(phone);
    }
    if (isblocked !== undefined) {
      fields.push(`isblocked = $${idx++}`);
      values.push(isblocked);
    }
    if (isadmin !== undefined) {
      fields.push(`isadmin = $${idx++}`);
      values.push(isadmin);
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: "Немає полів для оновлення" });
    }
    const updateQuery = `
      UPDATE Users
      SET ${fields.join(", ")}
      WHERE UserID = $${idx}
    `;

    values.push(userId);

    await client.query(updateQuery, values);

    res.json({ message: "Користувача оновлено успішно" });
  } catch (err) {
    console.error("Помилка оновлення користувача:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Оновлення профілю
exports.updateProfile = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Токен відсутній або некоректний" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { firstname, lastname, phone, email, username, isblocked, isadmin } =
      req.body;

    const fields = [];
    const values = [];

    if (firstname) {
      fields.push("firstname = $" + (fields.length + 1));
      values.push(firstname);
    }
    if (lastname) {
      fields.push("lastname = $" + (fields.length + 1));
      values.push(lastname);
    }
    if (phone) {
      fields.push("phone = $" + (fields.length + 1));
      values.push(phone);
    }
    if (email) {
      fields.push("email = $" + (fields.length + 1));
      values.push(email);
    }
    if (username) {
      fields.push("username = $" + (fields.length + 1));
      values.push(username);
    }
    if (isblocked !== undefined) {
      fields.push("isblocked = $" + (fields.length + 1));
      values.push(isblocked);
    }
    if (isadmin !== undefined) {
      fields.push("isadmin = $" + (fields.length + 1));
      values.push(isadmin);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Немає даних для оновлення" });
    }

    values.push(userId);
    const updateQuery = `
      UPDATE public.users
      SET ${fields.join(", ")}
      WHERE UserID = $${fields.length + 1};
    `;

    await client.query(updateQuery, values);
    res.json({ message: "Профіль оновлено успішно" });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Недійсний або прострочений токен" });
  }
};

// Видалення профілю
exports.deleteUser = async (req, res) => {
  const { userId } = req.body;

  try {
    const deleteQuery = "DELETE FROM Users WHERE UserID = $1";
    await client.query(deleteQuery, [userId]);

    res.json({ message: "Користувача видалено успішно" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
