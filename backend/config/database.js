const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// สร้างตาราง users
const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      fullname VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      birth_date DATE,
      weight DECIMAL(5,2),
      height DECIMAL(5,2),
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255),
      verification_token_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  try {
    await pool.query(query);
    console.log('Users table created successfully');
  } catch (error) {
    console.error('Error creating users table:', error);
  }
};

const createMedRemindsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS medReminds (
      id VARCHAR(255) PRIMARY KEY NOT NULL,
      name VARCHAR(255) NOT NULL,
      dosage VARCHAR(255) NOT NULL,
      times TEXT NOT NULL,
      startDate VARCHAR(255) NOT NULL,
      duration VARCHAR(255) NOT NULL,
      color VARCHAR(255) NOT NULL,
      reminderEnabled INTEGER NOT NULL,
      dayFrequency INTEGER NOT NULL DEFAULT 1,
      userId VARCHAR(255) NOT NULL DEFAULT ''
    )
  `;
  try {
    await pool.query(query);
    console.log('MedReminds table created successfully');
  } catch (error) {
    console.error('Error creating MedReminds table:', error);
  }
};

const createDoseHistoryTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS dose_history (
      id VARCHAR(255) PRIMARY KEY NOT NULL,
      medicationId VARCHAR(255) NOT NULL,
      timestamp VARCHAR(255) NOT NULL,
      taken INTEGER NOT NULL,
      userId VARCHAR(255) NOT NULL DEFAULT ''
    )
  `;
  try {
    await pool.query(query);
    console.log('Dose history table created successfully');
  } catch (error) {
    console.error('Error creating dose_history table:', error);
  }
};

// Migration function to add dayFrequency column if it doesn't exist
const addDayFrequencyColumn = async () => {
  const query = `
    ALTER TABLE medReminds 
    ADD COLUMN IF NOT EXISTS dayFrequency INTEGER NOT NULL DEFAULT 1
  `;
  try {
    await pool.query(query);
    console.log('dayFrequency column added successfully');
  } catch (error) {
    console.error('Error adding dayFrequency column:', error);
  }
};

createUsersTable();
createMedRemindsTable();
createDoseHistoryTable();
addDayFrequencyColumn();
module.exports = pool;