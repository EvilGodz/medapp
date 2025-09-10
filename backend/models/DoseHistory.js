const pool = require('../config/database');

const DoseHistory = {
  async getAll(userId) {
    const res = await pool.query('SELECT * FROM dose_history WHERE userId = $1', [userId]);
    return res.rows;
  },
  async getById(id, userId) {
    const res = await pool.query('SELECT * FROM dose_history WHERE id = $1 AND userId = $2', [id, userId]);
    return res.rows[0];
  },
  async create(dose, userId) {
    const { id, medRemindId, timestamp, taken } = dose;
    const takenInt = taken ? 1 : 0;
    await pool.query(
      'INSERT INTO dose_history (id, medremindid, timestamp, taken, userId) VALUES ($1,$2,$3,$4,$5)',
      [id, medRemindId, timestamp, takenInt, userId]
    );
  },
  async update(id, dose, userId) {
    const { medRemindId, timestamp, taken } = dose;
    const takenInt = taken ? 1 : 0;
    await pool.query(
      'UPDATE dose_history SET medremindid=$1, timestamp=$2, taken=$3 WHERE id=$4 AND userId=$5',
      [medRemindId, timestamp, takenInt, id, userId]
    );
  },
  async delete(id, userId) {
    await pool.query('DELETE FROM dose_history WHERE id = $1 AND userId = $2', [id, userId]);
  }
};

module.exports = DoseHistory; 