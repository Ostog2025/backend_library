const client = require("../db/db");

// Отримати бронювання та книги в користуванні
exports.getUserReservations = async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await client.query(
      `
      SELECT 
        r.reservationid, r.reservationdate, r.status, 
        b.bookid, b.title AS book_title, 
        l.duedate, l.loandate, l.returndate, l.duedate AS loan_duedate
      FROM reservations r
      LEFT JOIN loans l ON r.reservationid = l.reservationid
      LEFT JOIN copies c ON c.copyid = l.copyid
      LEFT JOIN books b ON b.bookid = c.bookid
      WHERE r.userid = $1;
      `,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Додати нове бронювання
exports.createReservation = async (req, res) => {
  const { userId, bookId, status, dueDate, loandate } = req.body;

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      INSERT INTO reservations (userid, reservationdate, status)
      VALUES ($1, CURRENT_DATE, $2) RETURNING reservationid;
      `,
      [userId, status]
    );
    const reservationId = rows[0].reservationid;

    await client.query(
      `
      INSERT INTO loans (bookid, reservationid, loandate, duedate)
      VALUES ($1, $2, $3, $4);
      `,
      [bookId, reservationId, loandate, dueDate]
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
  const { reservationId, status } = req.body;
  try {
    const { rows, rowCount } = await client.query(
      `
      UPDATE reservations
      SET status = $1
      WHERE reservationid = $2 RETURNING *;
      `,
      [status, reservationId]
    );
    rowCount > 0
      ? res.status(200).json(rows[0])
      : res.status(404).send("Reservation not found");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Видалити бронювання
exports.deleteReservation = async (req, res) => {
  try {
    const { rowCount } = await client.query(
      "DELETE FROM reservations WHERE reservationid = $1 RETURNING *;",
      [req.params.reservationId]
    );
    rowCount > 0
      ? res.status(200).send("Reservation deleted")
      : res.status(404).send("Reservation not found");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
