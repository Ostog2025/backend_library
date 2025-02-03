const client = require("../db/db");

// Отримати всі вподобання користувача
exports.getUserLikes = async (req, res) => {
  const userId = req.params.userid;

  try {
    const { rows } = await client.query(
      "SELECT * FROM likes WHERE userid = $1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No likes found for this user" });
    }
    return res.json(rows);
  } catch (error) {
    console.error("Error retrieving user likes:", error);
    return res.status(500).json({ message: "Error retrieving user likes" });
  }
};

// Додати нове вподобання
exports.addLike = async (req, res) => {
  const { userid, bookid } = req.body;

  try {
    // Перевірка на існування вподобання
    const { rows: existingLikes } = await client.query(
      "SELECT * FROM likes WHERE userid = $1 AND bookid = $2",
      [userid, bookid]
    );

    if (existingLikes.length > 0) {
      return res
        .status(400)
        .json({ message: "This user has already liked this book" });
    }

    // Додавання нового вподобання
    await client.query("INSERT INTO likes (userid, bookid) VALUES ($1, $2)", [
      userid,
      bookid,
    ]);
    return res.status(201).json({ message: "Like added successfully" });
  } catch (error) {
    console.error("Error adding like:", error);
    return res.status(500).json({ message: "Error adding like" });
  }
};

// Забрати вподобання
exports.removeLike = async (req, res) => {
  const { likeid } = req.params;

  try {
    // Перевірка, чи існує вподобання з вказаним likeid
    const { rows: existingLikes } = await client.query(
      "SELECT * FROM likes WHERE likeid = $1",
      [likeid]
    );

    if (existingLikes.length === 0) {
      return res.status(404).json({ message: "Like not found" });
    }

    // Видалення вподобання по likeid
    await client.query("DELETE FROM likes WHERE likeid = $1", [likeid]);
    return res.status(200).json({ message: "Like removed successfully" });
  } catch (error) {
    console.error("Error removing like:", error);
    return res.status(500).json({ message: "Error removing like" });
  }
};
