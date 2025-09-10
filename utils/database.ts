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
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medReminds (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      times TEXT NOT NULL,
      startDate TEXT NOT NULL,
      duration TEXT NOT NULL,
      color TEXT NOT NULL,
      reminderEnabled INTEGER NOT NULL,
      dayFrequency INTEGER NOT NULL DEFAULT 1,
      mealTiming TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS dose_history (
      id TEXT PRIMARY KEY NOT NULL,
      medremindid TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      taken INTEGER NOT NULL,
      time TEXT DEFAULT ''
    );
  `);
  
  // Add dayFrequency column if it doesn't exist (for existing databases)
  try {
    await db.execAsync(`ALTER TABLE medReminds ADD COLUMN dayFrequency INTEGER NOT NULL DEFAULT 1;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add mealTiming column if it doesn't exist (for existing databases)
  try {
    await db.execAsync(`ALTER TABLE medReminds ADD COLUMN mealTiming TEXT DEFAULT '';`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add time column to dose_history if it doesn't exist
  try {
    await db.execAsync(`ALTER TABLE dose_history ADD COLUMN time TEXT DEFAULT '';`);
  } catch (error) {
    // Column already exists, ignore error
  }
} 

export async function DropDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE medReminds;
    DROP TABLE dose_history;
    DROP TABLE medications;
  `);
} 