import fs from 'fs/promises';
import path from 'path';
import { getConfig } from './env.js';

async function ensureDbFile() {
  const { dbPath } = getConfig();

  await fs.mkdir(path.dirname(dbPath), { recursive: true });

  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({ transactions: [] }, null, 2));
  }
}

export async function readDb() {
  await ensureDbFile();

  const { dbPath } = getConfig();
  const raw = await fs.readFile(dbPath, 'utf8');

  if (!raw.trim()) {
    return { transactions: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
    };
  } catch {
    return { transactions: [] };
  }
}

export async function writeDb(data) {
  const { dbPath } = getConfig();

  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function getTransactions() {
  const db = await readDb();
  return db.transactions;
}

export async function saveTransactions(transactions) {
  await writeDb({ transactions });
}

export async function resetDb() {
  await saveTransactions([]);
}