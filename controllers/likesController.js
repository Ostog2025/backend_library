require("dotenv").config();
const client = require("../db/db");
const jwt = require("jsonwebtoken");

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Токен відсутній або некоректний формат");
  }

  const token = authHeader.split(" ")[1];

  console.log("Токен для перевірки:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);
    return decoded.userId;
  } catch (err) {
    console.error("Помилка при декодуванні токена:", err.message);
    throw new Error("Недійсний токен");
  }
}

// Отримати всі вподобання користувача

exports.getUserLikes = async (req, res) => {
  const bookCoversURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/book_covers/";

  try {
    const userId = getUserIdFromToken(req);

    const { rows } = await client.query(
      `SELECT l.likeid, b.bookid, b.title AS book_title, a.firstname AS author_firstname, a.lastname AS author_lastname, 
              p.name AS publisher_name, g.name AS genre_name, b.year, b.description AS book_description, 
              b.copiesavailable, b.totalcopies, b.photo_filename AS book_photo
       FROM books b
       JOIN authors a ON b.authorid = a.authorid
       JOIN publishers p ON b.publisherid = p.publisherid
       JOIN genres g ON b.genreid = g.genreid
       JOIN likes l ON b.bookid = l.bookid
       WHERE l.userid = $1`,
      [userId]
    );

    if (rows.length === 0) {
      console.log("Вподобання не знайдено для цього користувача");
      return res.status(404).json({ message: "Вподобання не знайдено" });
    }

    const modifiedRows = rows.map((row) => ({
      ...row,
      book_photo: row.book_photo ? `${bookCoversURL}${row.book_photo}` : null,
    }));

    return res.json(modifiedRows);
  } catch (error) {
    console.error("Помилка при отриманні вподобань:", error.message);
    return res.status(401).json({ message: error.message });
  }
};

// Додати нове вподобання
exports.addLike = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const { bookid } = req.body;

    const { rows: existingLikes } = await client.query(
      "SELECT * FROM likes WHERE userid = $1 AND bookid = $2",
      [userId, bookid]
    );

    if (existingLikes.length > 0) {
      return res.status(400).json({ message: "Ця книга вже була вподобана" });
    }

    await client.query("INSERT INTO likes (userid, bookid) VALUES ($1, $2)", [
      userId,
      bookid,
    ]);
    return res.status(201).json({ message: "Вподобання додано успішно" });
  } catch (error) {
    console.error("Помилка при додаванні вподобання:", error.message);
    return res.status(401).json({ message: error.message });
  }
};

// Видалити вподобання
exports.removeLike = async (req, res) => {
  try {
    const { likeid } = req.params;

    // Перевірити, чи вподобання належить цьому користувачу
    const { rows: existingLikes } = await client.query(
      "SELECT * FROM likes WHERE likeid = $1",
      [likeid]
    );

    if (existingLikes.length === 0) {
      return res
        .status(404)
        .json({ message: "Вподобання не знайдено або не належить вам" });
    }

    await client.query("DELETE FROM likes WHERE likeid = $1", [likeid]);
    return res.status(200).json({ message: "Вподобання видалено" });
  } catch (error) {
    console.error("Помилка при видаленні вподобання:", error.message);
    return res.status(401).json({ message: error.message });
  }
};
