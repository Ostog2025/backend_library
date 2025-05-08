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

// Отримати бронювання та книги в користуванні

exports.getUserReservations = async (req, res) => {
  const bookCoversURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/book_covers/";

  try {
    const userId = getUserIdFromToken(req);

    const result = await client.query(
      `
      SELECT 
        c.copyid, r.reservationid, r.reservationdate, r.status, 
        b.bookid, b.title AS book_title, 
        b.photo_filename as book_photo, 
        l.duedate, l.loandate, l.returndate, l.duedate AS loan_duedate
      FROM reservations r
      LEFT JOIN loans l ON r.reservationid = l.reservationid
      LEFT JOIN copies c ON c.copyid = l.copyid
      LEFT JOIN books b ON b.bookid = c.bookid
      WHERE r.userid = $1;
      `,
      [userId]
    );

    const modifiedRows = result.rows.map((row) => ({
      ...row,
      book_photo: row.book_photo ? `${bookCoversURL}${row.book_photo}` : null,
    }));

    res.json(modifiedRows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Додати нове бронювання
exports.createReservation = async (req, res) => {
  const { bookId, dueDate } = req.body;

  try {
    const userId = getUserIdFromToken(req);

    const { rows: availableCopies } = await client.query(
      `SELECT copyid FROM copies WHERE bookid = $1 AND available = true LIMIT 1;`,
      [bookId]
    );

    if (availableCopies.length === 0) {
      return res
        .status(400)
        .json({ message: "Немає вільних копій цієї книги для бронювання" });
    }

    const copyId = availableCopies[0].copyid;

    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO reservations (userid, reservationdate, status)
       VALUES ($1, CURRENT_DATE, 'active') RETURNING reservationid;`,
      [userId]
    );
    const reservationId = rows[0].reservationid;

    await client.query(
      `INSERT INTO loans (copyid, reservationid, loandate, duedate)
       VALUES ($1, $2, CURRENT_DATE, $3);`,
      [copyId, reservationId, dueDate]
    );

    await client.query(
      `UPDATE copies SET available = false WHERE copyid = $1;`,
      [copyId]
    );

    await client.query("COMMIT");

    res
      .status(201)
      .json({ message: "Reservation and loan created successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Оновити статус бронювання
exports.updateReservationStatus = async (req, res) => {
  const { reservationid, status } = req.body;
  try {
    const { rows, rowCount } = await client.query(
      `
      UPDATE reservations
      SET status = $1
      WHERE reservationid = $2 RETURNING *;
      `,
      [status, reservationid]
    );
    rowCount > 0
      ? res.status(200).json(rows[0])
      : res.status(404).send("Reservation not found");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Зміна статусу бронювання на 'cancelled'
exports.cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { copyId } = req.body; // Extracting copyId from the request

    console.log("Received copyId:", req.body.copyId);

    // Your existing query to cancel the reservation and update the copy availability
    const result = await client.query(
      `UPDATE reservations SET status = 'cancelled' WHERE reservationid = $1 RETURNING *;`,
      [reservationId]
    );

    if (result.rowCount > 0) {
      // Update the copy availability to false
      await client.query(
        `UPDATE copies SET available = true WHERE copyid = $1;`,
        [copyId]
      );

      res
        .status(200)
        .send(
          "Reservation status updated to cancelled and copy marked as unavailable."
        );
    } else {
      res.status(404).send("Reservation not found.");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Видалити бронювання
exports.deleteReservation = async (req, res) => {
  const { reservationId } = req.params;

  try {
    // 1. Видалити штрафи
    await client.query("DELETE FROM fines WHERE reservationid = $1;", [
      reservationId,
    ]);

    // 2. Видалити позики
    await client.query("DELETE FROM loans WHERE reservationid = $1;", [
      reservationId,
    ]);

    // 3. Видалити бронювання
    const { rowCount } = await client.query(
      "DELETE FROM reservations WHERE reservationid = $1 RETURNING *;",
      [reservationId]
    );

    rowCount > 0
      ? res.status(200).send("Reservation, loans and fines deleted")
      : res.status(404).send("Reservation not found");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
