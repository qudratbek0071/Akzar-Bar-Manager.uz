// /models/init.js
import { pool } from "./db.js";

export async function initTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','boss','waiter')),
    floor TEXT CHECK(floor IN ('zal','tepa','karaoke'))
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    floor TEXT NOT NULL CHECK(floor IN ('zal','tepa','karaoke')),
    number INTEGER NOT NULL,
    UNIQUE(floor, number)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS menu (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('drink','snack','dish'))
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL REFERENCES tables(id),
    user_id INTEGER REFERENCES users(id),
    items JSONB NOT NULL,           -- JSONB array [{productId, name, price, qty}]
    total INTEGER NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS stock_entries (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES menu(id),
    qty INTEGER NOT NULL,          -- приход или ввод остатков (+)
    type TEXT NOT NULL CHECK(type IN ('opening','incoming','adjustment')),
    created_at DATE DEFAULT NOW()
  )`);

  // Выдачи сотрудникам (заем/вынос продукции)
  await pool.query(`CREATE TABLE IF NOT EXISTS borrow_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES menu(id),
    qty INTEGER NOT NULL,
    returned_qty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}
