require("dotenv").config();
const bcrypt = require("bcrypt");
const client = require("./db/db");

console.log("SUPABASE_DB_URL:", process.env.SUPABASE_DB_URL);

// Оновлення паролів з insert
async function updateOldPasswords() {
  try {
    const users = await client.query(
      "SELECT userid, passwordhash FROM users WHERE passwordhash NOT LIKE '$2a$%'"
    );

    for (let user of users.rows) {
      const userId = user.userid;
      const passwordhash = user.passwordhash;

      const hashedPassword = await bcrypt.hash(passwordhash, 10);

      await client.query(
        "UPDATE users SET passwordhash = $1 WHERE userid = $2",
        [hashedPassword, userId]
      );

      console.log(`Пароль користувача ${userId} було зашифровано та оновлено.`);
    }

    console.log("Усі паролі були зашифровані та оновлені.");
  } catch (err) {
    console.error("Помилка при оновленні паролів:", err);
  }
}

updateOldPasswords();
