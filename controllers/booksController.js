const client = require("../db/db");
const supabase = require("../db/supabaseClient");
const path = require("path");

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

// Пошук за назвою книги

exports.searchBooks = async (req, res) => {
  const { query } = req.query;
  const bookCoversURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/book_covers/";

  console.log("Параметр запиту:", query);

  if (!query || query.trim() === "") {
    return res.status(400).send("Параметр 'query' є обов'язковим для пошуку");
  }

  try {
    const result = await client.query(
      `
      SELECT b.bookid, b.title, b.description, b.photo_filename
      FROM books b
      WHERE LOWER(b.title) LIKE LOWER($1)
      ORDER BY b.title
      LIMIT 10
      `,
      [`%${query}%`]
    );

    const booksWithFullUrls = result.rows.map((book) => ({
      ...book,
      photo_filename: book.photo_filename
        ? `${bookCoversURL}${book.photo_filename}`
        : null,
    }));

    console.log("Результати пошуку:", booksWithFullUrls);
    res.json(booksWithFullUrls);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
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

  const supabaseURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/book_covers/";

  try {
    let query = `
      SELECT b.bookid, b.title AS book_title, a.authorid, a.firstname AS author_firstname, a.lastname AS author_lastname, 
             p.name AS publisher_name, g.genreid, g.name AS genre_name, b.year, b.description AS book_description, 
             b.copiesavailable, b.totalcopies, b.photo_filename AS book_photo
      FROM books b
      LEFT JOIN authors a ON b.authorid = a.authorid
      LEFT JOIN publishers p ON b.publisherid = p.publisherid
      LEFT JOIN genres g ON b.genreid = g.genreid
      WHERE 1 = 1`;

    const params = [];
    if (authorid) query += ` AND b.authorid = $${params.push(authorid)}`;
    if (genreid) query += ` AND b.genreid = $${params.push(genreid)}`;
    if (publisherid)
      query += ` AND b.publisherid = $${params.push(publisherid)}`;

    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    const result = await client.query(query, params);

    const books = result.rows.map((book) => {
      return {
        ...book,
        book_photo: `${supabaseURL}${book.book_photo}`,
      };
    });

    res.json(books);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

exports.addBook = async (req, res) => {
  const {
    title,
    authorid,
    genreid,
    year,
    description,
    copiesavailable,
    totalcopies,
  } = req.body;

  let photo_filename = null;

  if (
    !title ||
    !authorid ||
    !genreid ||
    !year ||
    !copiesavailable ||
    !totalcopies
  ) {
    return res.status(400).send("Всі обов'язкові поля повинні бути заповнені.");
  }

  try {
    if (!req.file) {
      return res.status(400).send("Файл не був завантажений.");
    }

    console.log("File Buffer Size:", req.file.buffer.length);
    if (req.file.buffer.length === 0) {
      return res.status(400).send("Файл порожній.");
    }

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const fileName = `book_${Date.now()}${ext}`;

      const { error } = await supabase.storage
        .from("images/book_covers")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
          cacheControl: "3600",
        });

      if (error) {
        console.error(
          "Помилка при завантаженні фото в Supabase:",
          error.message
        );
        return res.status(500).send("Помилка при завантаженні фото.");
      }

      photo_filename = fileName;
    }

    const result = await client.query(
      `INSERT INTO books (title, authorid, genreid, year, description, copiesavailable, totalcopies, photo_filename)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING bookid`,
      [
        title,
        authorid,
        genreid,
        year,
        description || null,
        copiesavailable,
        totalcopies,
        photo_filename,
      ]
    );

    res.status(201).json({
      message: "Книга успішно додана",
      bookid: result.rows[0].bookid,
    });
  } catch (err) {
    console.error("Помилка при додаванні книги", err.stack);
    res.status(500).send("Помилка при додаванні книги");
  }
};

exports.editBook = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    authorid,
    genreid,
    year,
    description,
    copiesavailable,
    totalcopies,
  } = req.body;

  let photo_filename = null;

  if (
    !title ||
    !authorid ||
    !genreid ||
    !year ||
    !copiesavailable ||
    !totalcopies
  ) {
    return res.status(400).send("Всі обов'язкові поля повинні бути заповнені.");
  }

  try {
    if (req.file) {
      console.log("Завантаження файлу...");
      if (!req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).send("Файл порожній.");
      }

      const ext = path.extname(req.file.originalname);
      const fileName = `book_${Date.now()}${ext}`;

      const { error } = await supabase.storage
        .from("images/book_covers")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
          cacheControl: "3600",
        });

      if (error) {
        console.error(
          "Помилка при завантаженні файлу в Supabase:",
          error.message
        );
        return res.status(500).send("Помилка при завантаженні файлу.");
      }

      photo_filename = fileName;
    }

    let query = `
      UPDATE books SET title = $1, authorid = $2, genreid = $3, year = $4, description = $5,
          copiesavailable = $6, totalcopies = $7`;

    const values = [
      title,
      authorid,
      genreid,
      year,
      description || null,
      copiesavailable,
      totalcopies,
    ];

    // Якщо є нове фото, додаємо його до запиту
    if (photo_filename) {
      query += `, photo_filename = $8 WHERE bookid = $9 RETURNING bookid`;
      values.push(photo_filename, id);
    } else {
      query += ` WHERE bookid = $8 RETURNING bookid`;
      values.push(id);
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).send("Книга з таким ID не знайдена");
    }

    res.status(200).json({
      message: "Книга успішно відредагована",
      bookid: result.rows[0].bookid,
    });
  } catch (err) {
    console.error("Помилка при редагуванні книги", err.stack);
    res.status(500).send("Помилка при редагуванні книги");
  }
};

// Отримання інформації про книгу за id

exports.getBookById = async (req, res) => {
  const { id } = req.params;
  const bookCoversURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/book_covers/";
  const authorPhotosURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/authors/";
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

    const book = result.rows[0];

    const bookWithFullUrls = {
      ...book,
      author_photo: book.author_photo
        ? `${authorPhotosURL}${book.author_photo}`
        : null,
      book_photo: book.book_photo ? `${bookCoversURL}${book.book_photo}` : null,
    };

    res.json(bookWithFullUrls);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

// Видалення книги за id
exports.deleteBookById = async (req, res) => {
  const { id } = req.params;

  try {
    await client.query("BEGIN");

    const copyResult = await client.query(
      `SELECT copyid FROM copies WHERE bookid = $1`,
      [id]
    );

    const copyIds = copyResult.rows.map((row) => row.copyid);

    for (const copyId of copyIds) {
      await client.query(`DELETE FROM loans WHERE copyid = $1`, [copyId]);
    }

    await client.query(`DELETE FROM copies WHERE bookid = $1`, [id]);

    const result = await client.query(
      `DELETE FROM books WHERE bookid = $1 RETURNING bookid`,
      [id]
    );

    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).send("Книга не знайдена для видалення");
    }

    res.status(200).send(`Книга з id ${id} успішно видалена`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

// Отримання авторів
exports.getAuthors = async (req, res) => {
  try {
    const result = await client.query(
      "SELECT authorid, firstname, lastname FROM authors"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

// Отримання жанрів
exports.getGenres = async (req, res) => {
  try {
    const result = await client.query("SELECT genreid, name FROM genres");
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};

// Отримання видавців
exports.getPublishers = async (req, res) => {
  try {
    const result = await client.query(
      "SELECT publisherid, name FROM publishers"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Помилка при виконанні запиту", err.stack);
    res.status(500).send("Помилка при виконанні запиту до БД");
  }
};
