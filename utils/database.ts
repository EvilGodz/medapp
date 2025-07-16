import * as SQLite from 'expo-sqlite';

const DB_NAME = 'medications.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  // Create tables if they don't exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      times TEXT NOT NULL,
      startDate TEXT NOT NULL,
      duration TEXT NOT NULL,
      color TEXT NOT NULL,
      reminderEnabled INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dose_history (
      id TEXT PRIMARY KEY NOT NULL,
      medicationId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      taken INTEGER NOT NULL
    );
  `);
} 