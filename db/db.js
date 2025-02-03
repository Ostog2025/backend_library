const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(() => console.log("Підключено до Supabase PostgreSQL"))
  .catch((err) =>
    console.error("Помилка при підключенні до Supabase", err.stack)
  );

module.exports = client;
