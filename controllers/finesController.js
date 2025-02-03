const client = require("../db/db");

// Штрафи користувача
exports.getUserFines = async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT f.fineid, f.amount, f.paymentstatus 
      FROM fines f 
      JOIN reservations r ON f.reservationid = r.reservationid 
      WHERE r.userid = $1
    `;
    const result = await client.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching fines:", error);
    res.status(500).json({ message: "Error fetching fines" });
  }
};

// Загальний штраф користувача
exports.getTotalUserFines = async (req, res) => {
  const { userId } = req.params;
  try {
    const totalFineQuery = `
      SELECT SUM(f.amount) AS total_fines
      FROM fines f
      JOIN reservations r ON f.reservationid = r.reservationid
      WHERE r.userid = $1
    `;
    const totalFineResult = await client.query(totalFineQuery, [userId]);

    res.status(200).json({
      totalFines: totalFineResult.rows[0].total_fines || 0,
    });
  } catch (error) {
    console.error("Error fetching total fines:", error);
    res.status(500).json({ message: "Error fetching total fines" });
  }
};

// Додавання штрафу
exports.addFine = async (req, res) => {
  const { reservationId, amount, paymentStatus } = req.body;
  try {
    const query = `
      INSERT INTO fines (reservationid, amount, paymentstatus) 
      VALUES ($1, $2, $3) RETURNING *
    `;
    const result = await client.query(query, [
      reservationId,
      amount,
      paymentStatus,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding fine:", error);
    res.status(500).json({ message: "Error adding fine" });
  }
};

// Видалення штрафу
exports.deleteFine = async (req, res) => {
  const { fineId } = req.params;
  try {
    const query = `DELETE FROM fines WHERE fineid = $1 RETURNING *`;
    const result = await client.query(query, [fineId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Fine not found" });
    }

    res.status(200).json({ message: "Fine deleted successfully" });
  } catch (error) {
    console.error("Error deleting fine:", error);
    res.status(500).json({ message: "Error deleting fine" });
  }
};
