import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (process.env.VERCEL)
    throw new Error('SQLite local não é armazenamento persistente na Vercel. Use o host da API.');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
// In hosted API mode, refuse to create a missing storage directory.
if (process.env.NODE_ENV === 'production' && process.env.API_ONLY === 'true') {
    if (!process.env.DATA_DIR || !path.isAbsolute(process.env.DATA_DIR) || !fs.existsSync(DATA_DIR) || !fs.statSync(DATA_DIR).isDirectory())
        throw new Error('Configure e monte o disco persistente antes de iniciar a API.');
} else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
export const db = new Database(path.join(DATA_DIR, 'financas.sqlite'));
export { ROOT };
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,monthly_income_cents INTEGER DEFAULT 0,theme TEXT DEFAULT 'auto',onboarded INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS transactions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,type TEXT NOT NULL CHECK(type IN ('income','expense')),amount_cents INTEGER NOT NULL CHECK(amount_cents>0),category TEXT NOT NULL,description TEXT NOT NULL,date TEXT NOT NULL,source TEXT DEFAULT 'manual',created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS tx_user_date ON transactions(user_id,date);
CREATE TABLE IF NOT EXISTS goals(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,target_cents INTEGER NOT NULL CHECK(target_cents>0),saved_cents INTEGER NOT NULL DEFAULT 0 CHECK(saved_cents>=0),deadline TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS goal_contributions(id TEXT PRIMARY KEY,goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,amount_cents INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS pending_actions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL);
`);
