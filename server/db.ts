import initSqlJs, { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

const DB_PATH = "lighter_oi.db";
let db: Database | null = null;
let saveTimer: NodeJS.Timeout | null = null;

async function initDB() {
  const SQL = await initSqlJs();
  
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS rounds(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opens_at TEXT NOT NULL,
      closes_at TEXT NOT NULL,
      actual_oi REAL,
      status TEXT NOT NULL DEFAULT 'open'
    );
    CREATE TABLE IF NOT EXISTS predictions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      user TEXT NOT NULL,
      value REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(round_id, user)
    );
    CREATE TABLE IF NOT EXISTS scores(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      user TEXT NOT NULL,
      diff REAL NOT NULL,
      rank INTEGER NOT NULL
    );
  `);
  
  saveDB();
}

function saveDB() {
  if (!db) return;
  
  // Debounce saves
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!db) return;
    try {
      const data = db.export();
      writeFileSync(DB_PATH, data);
    } catch (e) {
      console.error('Failed to save DB:', e);
    }
  }, 100);
}

function run(sql: string, params: any[] = []) {
  if (!db) throw new Error('DB not initialized');
  db.run(sql, params);
  saveDB();
}

function get(sql: string, params: any[] = []): any {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

function all(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export { initDB, run, get, all };
