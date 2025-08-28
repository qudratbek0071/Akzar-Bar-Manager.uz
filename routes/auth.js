// /routes/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../models/db.js";
import { signToken, authRequired, only } from "../utils/authMiddleware.js";

export const authRouter = Router();

// Логин
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const u = rows[0];
    if (!u) return res.status(404).json({ error: "Пользователь не найден" });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: "Неверный пароль" });

    const token = signToken({ id: u.id, role: u.role, name: u.name, floor: u.floor });
    res.json({ token, role: u.role, name: u.name, floor: u.floor, id: u.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Регистрация (для сидов или админа через Postman)
authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, floor } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,password,role,floor) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name, email, hash, role, floor ?? null]
    );
    res.json({ id: rows[0].id, email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Список пользователей (админ)
authRouter.get("/users", authRequired, only("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, name, role, floor FROM users ORDER BY role, name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
