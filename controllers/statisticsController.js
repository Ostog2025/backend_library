const client = require("../db/db");
const { Parser } = require("json2csv");
const fs = require("fs");
const csv = require("csv-parser");

// Найчастіше взяті книги
exports.getTopBooks = async (req, res) => {
  try {
    const query = `
      SELECT b.title, COUNT(*) AS loan_count
      FROM loans l
      JOIN copies c ON l.copyid = c.copyid
      JOIN books b ON c.bookid = b.bookid
      GROUP BY b.title
      ORDER BY loan_count DESC
      LIMIT 10;
    `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при отриманні найпопулярніших книг:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Найактивніші користувачі
exports.getTopUsers = async (req, res) => {
  try {
    const query = `
      SELECT u.userid, u.firstname, u.lastname, COUNT(*) AS loans_count FROM loans l
      JOIN reservations r ON l.reservationid = r.reservationid
      JOIN users u ON r.userid = u.userid
      GROUP BY u.userid
      ORDER BY loans_count DESC
      LIMIT 10;
    `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при отриманні найактивніших користувачів:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Найзатребуваніші жанри
exports.getTopGenres = async (req, res) => {
  try {
    const query = `
      SELECT g.name AS genre, COUNT(*) AS loans_count FROM loans l
      JOIN copies c ON l.copyid = c.copyid
      JOIN books b ON c.bookid = b.bookid
      JOIN genres g ON b.genreid = g.genreid
      GROUP BY g.name
      ORDER BY loans_count DESC
      LIMIT 10;
    `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при отриманні жанрів:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Позики по місяцях
exports.getMonthlyLoans = async (req, res) => {
  try {
    const query = `
        SELECT TO_CHAR(loandate, 'YYYY-MM') AS month, COUNT(*) AS loans_count
        FROM loans
        GROUP BY month
        ORDER BY month;
      `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при отриманні статистики по місяцях:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Книги з найменшою кількістю копій
exports.getBooksWithFewestCopies = async (req, res) => {
  try {
    const query = `
        SELECT b.title, COUNT(c.copyid) AS copies
        FROM books b
        LEFT JOIN copies c ON b.bookid  = c.bookid 
        GROUP BY b.title
        ORDER BY copies ASC
        LIMIT 5;
      `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при отриманні книг з найменше копіями:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Рекомендації для докуплення книг
exports.getBooksToRestock = async (req, res) => {
  try {
    const query = `
        SELECT b.title, COUNT(c.copyid) AS copies
        FROM books b
        LEFT JOIN copies c ON b.bookid  = c.bookid 
        GROUP BY b.title
        HAVING COUNT(c.copyid) < 3
        ORDER BY copies ASC;
      `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при отриманні книг для докуплення:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Середня кількість копій на книгу
exports.getAverageCopiesPerBook = async (req, res) => {
  try {
    const query = `
        SELECT ROUND(CAST(COUNT(c.copyid) AS NUMERIC) / COUNT(DISTINCT b.bookid ), 2) AS average_copies
        FROM books b
        LEFT JOIN copies c ON b.bookid  = c.bookid ;
      `;
    const result = await client.query(query);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Помилка при обчисленні середньої кількості копій:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Експорт книг у CSV
exports.exportBooksToCSV = async (req, res) => {
  try {
    const query = `
      SELECT b.bookid, b.title, b.year, a.firstname AS author_firstname, a.lastname AS author_lastname,
             p.name AS publisher_name, g.name AS genre_name, b.totalcopies, b.copiesavailable FROM books b
      JOIN authors a ON b.authorid = a.authorid
      JOIN publishers p ON b.publisherid = p.publisherid
      JOIN genres g ON b.genreid = g.genreid;
    `;
    const result = await client.query(query);
    const parser = new Parser();
    const csvData = "\uFEFF" + parser.parse(result.rows);

    res.header("Content-Type", "text/csv");
    res.attachment("books_export.csv");
    return res.send(csvData);
  } catch (err) {
    console.error("Помилка при експорті CSV:", err);
    res.status(500).send("Помилка сервера");
  }
};

// Імпорт книг із CSV
exports.importBooksFromCSV = async (req, res) => {
  const filePath = req.file.path;
  const books = [];

  try {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        books.push(row);
      })
      .on("end", async () => {
        for (const book of books) {
          await client.query(
            `INSERT INTO books (title, year, authorid, publisherid, genreid, totalcopies, copiesavailable)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (bookid) DO NOTHING`,
            [
              book.title,
              parseInt(book.year),
              parseInt(book.authorid),
              parseInt(book.publisherid),
              parseInt(book.genreid),
              parseInt(book.totalcopies),
              parseInt(book.copiesavailable),
            ]
          );
        }

        fs.unlinkSync(filePath);
        res.status(200).json({ message: "Імпорт завершено успішно" });
      });
  } catch (err) {
    console.error("Помилка при імпорті CSV:", err);
    res.status(500).send("Помилка сервера при імпорті");
  }
};
