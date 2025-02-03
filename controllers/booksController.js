const client = require("../db/db");

// Отримання авторів, жанрів та видавництв
exports.getFilters = async (req, res) => {
  try {
    const authorsQuery = "SELECT authorid, firstname, lastname FROM authors";
    const authorsResult = await client.query(authorsQuery);

    const genresQuery = "SELECT genreid, name FROM genres";
    const genresResult = await client.query(genresQuery);

    const publishersQuery = "SELECT publisherid, name FROM publishers";
    const publishersResult = await client.query(publishersQuery);

    res.json({
      authors: authorsResult.rows,
      genres: genresResult.rows,
      publishers: publishersResult.rows,
    });
  } catch (err) {
    console.error("Помилка при отриманні фільтрів:", err.stack);
    res.status(500).send("Помилка при отриманні фільтрів з БД");
  }
};

// Отримання всіх книг з фільтрами
exports.getBooks = async (req, res) => {
  const {
    authorid,
    genreid,
    publisherid,
    sortBy = "title",
    sortOrder = "asc",
  } = req.query;
  try {
    let query = `
      SELECT b.bookid, b.title AS book_title, a.firstname AS author_firstname, a.lastname AS author_lastname, 
             p.name AS publisher_name, g.name AS genre_name, b.year, b.description AS book_description, 
             b.copiesavailable, b.totalcopies, b.photo_filename AS book_photo
      FROM books b
      JOIN authors a ON b.authorid = a.authorid
      JOIN publishers p ON b.publisherid = p.publisherid
      JOIN genres g ON b.genreid = g.genreid
      WHERE 1 = 1`;
    const params = [];
    if (authorid) query += ` AND b.authorid = $${params.push(authorid)}`;
    if (genreid) query += ` AND b.genreid = $${params.push(genreid)}`;
    if (publisherid)
      query += ` AND b.publisherid = $${params.push(publisherid)}`;
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    res.json((await client.query(query, params)).rows);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

// Пошук за назвою книги
exports.searchBooks = async (req, res) => {
  const { query } = req.query;
  console.log("Параметр запиту:", query);
  if (!query || query.trim() === "") {
    return res.status(400).send("Параметр 'query' є обов'язковим для пошуку");
  }
  try {
    const result = await client.query(
      `
      SELECT b.bookid, b.title, b.description, b.photo_filename FROM books b
      WHERE LOWER(b.title) LIKE LOWER($1)
      ORDER BY b.title
      LIMIT 10
      `,
      [`%${query}%`]
    );

    console.log("Результати пошуку:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

// Отримання інформації про книгу за id
exports.getBookById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(
      `SELECT
        b.bookid,
        b.title AS book_title,
        a.firstname AS author_firstname,
        a.lastname AS author_lastname,
        a.biography AS author_biography,
        a.photo_filename AS author_photo,
        p.name AS publisher_name,
        p.address AS publisher_address,
        p.phone AS publisher_phone,
        p.email AS publisher_email,
        g.name AS genre_name,
        b.year,
        b.description AS book_description,
        b.copiesavailable,
        b.totalcopies,
        b.photo_filename AS book_photo
      FROM
        books b
      JOIN authors a ON b.authorid = a.authorid
      JOIN publishers p ON b.publisherid = p.publisherid
      JOIN genres g ON b.genreid = g.genreid
      WHERE b.bookid = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Книга не знайдена");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

// Видалення книги за id
exports.deleteBookById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(
      `DELETE FROM books WHERE bookid = $1 RETURNING bookid`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Книга не знайдена для видалення");
    }
    res.status(200).send(`Книга з id ${id} успішно видалена`);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};
