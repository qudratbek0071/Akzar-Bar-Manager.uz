// seed.js
import bcrypt from "bcrypt";
import { pool } from "./models/db.js";
import { initTables } from "./models/init.js";

// Ensure tables exist before seeding

async function run(sql, params=[]) {
  const result = await pool.query(sql, params);
  const inserted = result.rows && result.rows[0] && (result.rows[0].id ?? result.rows[0].lastid);
  return inserted ?? null;
}

async function get(sql, params=[]) {
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function seed() {
  // Ensure tables exist
  await initTables();
  // Пользователи
  const users = [
    { name: "Бобур ака", email: "boss@gmail.com",      pass: "Boss12345",    role: "boss",  floor: null },
    { name: "Кудратбек", email: "Qudratbek0709@gmail.com", pass: "Qudratbek07", role: "admin", floor: null },
    { name: "Рахматулло", email: "Zal@gmail.com",      pass: "Wather12345",  role: "waiter", floor: "zal" },
    { name: "Акмалжон",  email: "Tepa@gmail.com",      pass: "Wather12345",  role: "waiter", floor: "tepa" },
    { name: "Дийор",     email: "Karaoke@gmail.com",   pass: "Wather12345",  role: "waiter", floor: "karaoke" },
  ];
  for (const u of users) {
    const exists = await get(`SELECT id FROM users WHERE email=$1`, [u.email]);
    if (!exists) {
      const hash = await bcrypt.hash(u.pass, 10);
      await run(
        `INSERT INTO users (name,email,password,role,floor) VALUES ($1,$2,$3,$4,$5)`,
        [u.name, u.email, hash, u.role, u.floor]
      );
    }
  }

  // Столы: Зал (4), Тепа (5), Караоке (3 — можно поменять)
  const tables = [
    ...Array.from({ length: 4 }, (_, i) => ({ floor: "zal", number: i + 1 })),
    ...Array.from({ length: 5 }, (_, i) => ({ floor: "tepa", number: i + 1 })),
    ...Array.from({ length: 3 }, (_, i) => ({ floor: "karaoke", number: i + 1 })),
  ];
  for (const t of tables) {
    const exists = await get(
      `SELECT id FROM tables WHERE floor=$1 AND number=$2`,
      [t.floor, t.number]
    );
    if (!exists) {
      await run(`INSERT INTO tables (floor, number) VALUES ($1,$2)`, [t.floor, t.number]);
    }
  }

  // Меню (из твоего списка)
  const toMenu = (name, price, category) => ({ name, price, category });
  const drinks = [
    ["Garden", 20000], ["Кола 1.5л", 18000], ["Флавис Катта", 18000],
    ["Пепси 1.5л", 18000], ["Фанта 1.5л", 18000], ["Red Bull", 25000],
    ["Flash", 15000], ["Adrenaline", 20000], ["Флавис баночный", 15000],
    ["Мохито", 15000], ["Кола 1л", 15000], ["Пепси 1л", 15000],
    ["Фанта 1л", 15000], ["Чорток", 20000], ["Сок", 18000], ["Безгаз", 8000],
  ].map(([n, p]) => toMenu(n, p, "drink"));

  const snacks = [
    ["Чипсы", 15000], ["Криешки", 10000], ["Миндаль", 10000],
    ["Арахис", 15000], ["Куртоп", 10000], ["Хондом писта", 10000], ["Писта", 15000],
  ].map(([n, p]) => toMenu(n, p, "snack"));

  const dishes = [
    ["Жиз", 125000], ["Канотча", 40000], ["Фрикадельки", 25000],
    ["Чучвара", 25000], ["Стейк", 55000], ["Тушонка", 125000],
  ].map(([n, p]) => toMenu(n, p, "dish"));

  const all = [...drinks, ...snacks, ...dishes];
  for (const m of all) {
    const exists = await get(`SELECT id FROM menu WHERE name=$1`, [m.name]);
    if (!exists) {
      await run(`INSERT INTO menu (name, price, category) VALUES ($1,$2,$3)`, [m.name, m.price, m.category]);
    }
  }

  console.log("✅ Сидинг завершён");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Ошибка сидинга:", e);
  process.exit(1);
});
