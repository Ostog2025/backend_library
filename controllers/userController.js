const client = require("../db/db");

// Пошук даних
exports.getUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    const query = `
      SELECT *
      FROM Users
      WHERE UserID = $1;
    `;
    const result = await client.query(query, [userId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Користувача не знайдено" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Оновлення профілю
exports.updateProfile = async (req, res) => {
  const { userId, firstName, lastName, phone } = req.body;

  try {
    const fields = [];
    const values = [];

    if (firstName) {
      fields.push("FirstName = $" + (fields.length + 1));
      values.push(firstName);
    }
    if (lastName) {
      fields.push("LastName = $" + (fields.length + 1));
      values.push(lastName);
    }
    if (phone) {
      fields.push("Phone = $" + (fields.length + 1));
      values.push(phone);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Немає даних для оновлення" });
    }

    values.push(userId);
    const updateQuery = `
      UPDATE Users
      SET ${fields.join(", ")}
      WHERE UserID = $${fields.length + 1};
    `;
    await client.query(updateQuery, values);

    res.json({ message: "Профіль оновлено успішно" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
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
