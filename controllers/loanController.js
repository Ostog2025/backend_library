require("dotenv").config();
const client = require("../db/db");

// Отримати повну історію позик
exports.getLoanHistory = async (req, res) => {
  try {
    const { rows } = await client.query(`
        SELECT 
          l.loanid, l.loandate, l.duedate, l.returndate,
          u.lastname, 
          b.title AS book_title
        FROM loans l
        JOIN reservations r ON l.reservationid = r.reservationid
        JOIN users u ON r.userid = u.userid
        JOIN copies c ON l.copyid = c.copyid
        JOIN books b ON c.bookid = b.bookid
        ORDER BY l.loandate DESC;
      `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Отримати всі активні позики

exports.getActiveLoans = async (req, res) => {
  const bookCoversURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/book_covers/";
  try {
    const { rows } = await client.query(`
      SELECT 
        l.loanid, l.loandate, l.duedate, l.returndate,
        u.userid, u.email, u.lastname,
        b.bookid, b.title AS book_title, b.photo_filename,
        c.copyid, r.status, r.reservationId
      FROM loans l
      JOIN reservations r ON l.reservationid = r.reservationid
      JOIN users u ON r.userid = u.userid
      JOIN copies c ON l.copyid = c.copyid
      JOIN books b ON c.bookid = b.bookid
      WHERE l.returndate IS NULL;
    `);

    const modifiedRows = rows.map((row) => ({
      ...row,
      book_photo: row.photo_filename
        ? `${bookCoversURL}${row.photo_filename}`
        : null,
    }));

    res.json(modifiedRows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const FormData = require("form-data");
const Mailgun = require("mailgun.js");

// Створюємо функцію для відправки email
exports.sendReturnReminders = async (req, res) => {
  let { email, book_title, duedate } = req.body;

  email = email.trim();

  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
  });

  try {
    if (!["avtoravtornij@gmail.com"].includes(email)) {
      return res
        .status(403)
        .json({ message: "Email is not authorized for sandbox mode." });
    }

    const msg = {
      from: "Library Reminder <postmaster@sandbox5631f76a62df4ba9a9b55584263af83c.mailgun.org>",
      to: [email],
      subject: "Нагадування про повернення книги",
      text: `Нагадуємо, що книгу "${book_title}" потрібно повернути до ${new Date(
        duedate
      ).toLocaleDateString("uk-UA")}.\n\nДякуємо!`,
    };

    const response = await mg.messages.create(
      "sandbox5631f76a62df4ba9a9b55584263af83c.mailgun.org",
      msg
    );

    console.log("Mailgun response:", response);
    res.json({ message: "Нагадування надіслано успішно." });
  } catch (error) {
    console.error("Mailgun error:", error);
    res.status(500).json({ message: "Помилка при надсиланні нагадування." });
  }
};

exports.adminCreateReservation = async (req, res) => {
  const { userId, bookId, dueDate } = req.body;
  try {
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
      .json({ message: "Бронювання створено адміністратором успішно" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).send("Server Error");
  }
};
