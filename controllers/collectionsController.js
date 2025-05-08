const client = require("../db/db");

const handleError = (res, err, message) => {
  console.error(message, err.stack);
  res.status(500).send(message);
};

// Всі колекції

exports.getAllCollections = async (req, res) => {
  const bookCoversURL =
    "https://uvwetrfuyqrggehpmrjr.supabase.co/storage/v1/object/public/images/book_covers/";

  try {
    const result = await client.query(`
      SELECT c.collectionid AS catalog_id, c.name AS catalog_name, c.entrydate AS catalog_entry_date,
             b.bookid AS book_id, b.title AS book_title, b.year AS book_year, b.description AS book_description,
             b.copiesavailable AS available_copies, b.totalcopies AS total_copies, b.photo_filename AS book_photo
      FROM collections c
      JOIN collectionbooks cb ON c.collectionid = cb.collectionid
      JOIN books b ON cb.bookid = b.bookid;
    `);

    const catalogs = result.rows.reduce((acc, row) => {
      const {
        catalog_id,
        catalog_name,
        catalog_entry_date,
        book_photo,
        ...book
      } = row;
      const fullPhotoURL = book_photo ? `${bookCoversURL}${book_photo}` : null;

      acc[catalog_id] ||= {
        catalog_id,
        catalog_name,
        catalog_entry_date,
        books: [],
      };

      acc[catalog_id].books.push({
        ...book,
        book_photo: fullPhotoURL,
      });

      return acc;
    }, {});

    res.json(Object.values(catalogs));
  } catch (err) {
    handleError(res, err, "Помилка при отриманні колекцій");
  }
};

// Книги з колекції за id
exports.getBooksInCollection = async (req, res) => {
  try {
    const result = await client.query(
      `SELECT b.* FROM books b JOIN collectionbooks cb ON b.bookid = cb.bookid WHERE cb.collectionid = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, "Помилка при отриманні книг з колекції");
  }
};

// Створити нову колекцію
exports.createCollection = async (req, res) => {
  const { name, entrydate } = req.body;
  try {
    const result = await client.query(
      `INSERT INTO collections (name, entrydate) VALUES ($1, $2) RETURNING *`,
      [name, entrydate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err, "Помилка при створенні колекції");
  }
};

// Видалити колекцію
exports.deleteCollection = async (req, res) => {
  try {
    const result = await client.query(
      `DELETE FROM collections WHERE collectionid = $1 RETURNING *`,
      [req.params.id]
    );
    result.rowCount
      ? res.status(200).send("Колекцію успішно видалено")
      : res.status(404).send("Колекцію не знайдено");
  } catch (err) {
    handleError(res, err, "Помилка при видаленні колекції");
  }
};

// Оновити колекцію
exports.updateCollection = async (req, res) => {
  const { name, bookIdToAdd, bookIdToRemove } = req.body;
  const collectionId = req.params.id;

  try {
    if (name)
      await client.query(
        `UPDATE collections SET name = $1 WHERE collectionid = $2`,
        [name, collectionId]
      );
    if (bookIdToAdd)
      await client.query(
        `INSERT INTO collectionbooks (collectionid, bookid) VALUES ($1, $2)`,
        [collectionId, bookIdToAdd]
      );
    if (bookIdToRemove)
      await client.query(
        `DELETE FROM collectionbooks WHERE collectionid = $1 AND bookid = $2`,
        [collectionId, bookIdToRemove]
      );

    res.status(200).send("Колекцію успішно оновлено");
  } catch (err) {
    handleError(res, err, "Помилка при оновленні колекції");
  }
};
