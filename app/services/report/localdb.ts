
import * as SQLite from 'expo-sqlite';

// New API for SDK 50+
let db: SQLite.SQLiteDatabase;

export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('rork_glucose.db');
  }
  return db;
}

export async function initDatabase() {
  const database = await getDB();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS blood_glucose (
      id TEXT PRIMARY KEY,
      value REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      source TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hourly_steps (
      id TEXT PRIMARY KEY,
      hour_start INTEGER NOT NULL,
      step_count INTEGER NOT NULL,
      flights_climbed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meal_records (
      id TEXT PRIMARY KEY,
      photo_path TEXT,
      recorded_at INTEGER NOT NULL,
      pre_glucose REAL,
      peak_glucose REAL,
      post_meal_steps INTEGER,
      insight TEXT
    );

    CREATE TABLE IF NOT EXISTS heart_rate (
      id TEXT PRIMARY KEY,
      bpm INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      motion_context TEXT
    );

    CREATE TABLE IF NOT EXISTS local_reports (
      id TEXT PRIMARY KEY,
      generated_at INTEGER NOT NULL,
      period_type TEXT NOT NULL,
      report_json TEXT NOT NULL
    );
  `);
}

export async function saveGlucoseRecords(records: { value: number; timestamp: string; source: string }[]) {
  const database = await getDB();
  for (const r of records) {
    await database.runAsync(
      'INSERT OR IGNORE INTO blood_glucose (id, value, timestamp, source) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), r.value, new Date(r.timestamp).getTime(), r.source]
    );
  }
}

export async function saveReport(report: any) {
  const database = await getDB();
  await database.runAsync(
      'INSERT INTO local_reports (id, generated_at, period_type, report_json) VALUES (?, ?, ?, ?)',
      [report.reportId, new Date(report.generatedAt).getTime(), report.period.type, JSON.stringify(report)]
  );
}
