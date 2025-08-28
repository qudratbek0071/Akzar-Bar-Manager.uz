// /routes/menu.js
import { Router } from "express";
import { pool } from "../models/db.js";
import { authRequired, only } from "../utils/authMiddleware.js";

export const menuRouter = Router();

// Список меню
menuRouter.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM menu ORDER BY category, name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Добавить — только admin
menuRouter.post("/", authRequired, only("admin"), async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO menu (name, price, category) VALUES ($1,$2,$3) RETURNING id`,
      [name, price, category]
    );
    res.json({ id: rows[0].id, name, price, category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

menuRouter.put("/:id", authRequired, only("admin"), async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const result = await pool.query(
      `UPDATE menu SET name=$1, price=$2, category=$3 WHERE id=$4`,
      [name, price, category, req.params.id]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

menuRouter.delete("/:id", authRequired, only("admin"), async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM menu WHERE id=$1`, [req.params.id]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
