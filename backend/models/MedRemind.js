const pool = require('../config/database');

const MedReminds = {
  async getAll(userId) {
    const res = await pool.query('SELECT * FROM medReminds WHERE userId = $1', [userId]);
    return res.rows;
  },
  async getById(id, userId) {
    const res = await pool.query('SELECT * FROM medReminds WHERE id = $1 AND userId = $2', [id, userId]);
    return res.rows[0];
  },
  async create(med, userId) {
    const { id, name, dosage, times, startDate, duration, color, reminderEnabled, dayFrequency } = med;
    await pool.query(
      'INSERT INTO medReminds (id, name, dosage, times, startDate, duration, color, reminderEnabled, dayFrequency, userId) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [id, name, dosage, times, startDate, duration, color, reminderEnabled, dayFrequency || 1, userId]
    );
  },
  async update(id, med, userId) {
    const { name, dosage, times, startDate, duration, color, reminderEnabled, dayFrequency } = med;
    await pool.query(
      'UPDATE medReminds SET name=$1, dosage=$2, times=$3, startDate=$4, duration=$5, color=$6, reminderEnabled=$7, dayFrequency=$8 WHERE id=$9 AND userId=$10',
      [name, dosage, times, startDate, duration, color, reminderEnabled, dayFrequency || 1, id, userId]
    );
  },
  async delete(id, userId) {
    await pool.query('DELETE FROM medReminds WHERE id = $1 AND userId = $2', [id, userId]);
  }
};

module.exports = MedReminds; 