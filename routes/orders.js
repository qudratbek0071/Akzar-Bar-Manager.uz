// /routes/orders.js
import { Router } from "express";
import { pool } from "../models/db.js";
import { authRequired, only } from "../utils/authMiddleware.js";

export const ordersRouter = Router();

// Столы по этажам
ordersRouter.get("/tables/:floor", authRequired, async (req, res) => {
  try {
    const floor = req.params.floor; // 'zal' | 'tepa' | 'karaoke'
    if (req.user.role === "waiter" && req.user.floor !== floor) {
      return res.status(403).json({ error: "Нет доступа к этому этажу" });
    }
    const { rows } = await pool.query(`SELECT * FROM tables WHERE floor = $1 ORDER BY number`, [floor]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать заказ
ordersRouter.post("/", authRequired, async (req, res) => {
  try {
    const { table_id, items, total } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "items должен быть массивом" });
    if (req.user.role === "waiter") {
      const { rows: tRows } = await pool.query(`SELECT floor FROM tables WHERE id=$1`, [table_id]);
      const t = tRows[0];
      if (!t || t.floor !== req.user.floor) return res.status(403).json({ error: "Нет доступа к столу" });
    }
    const { rows } = await pool.query(
      `INSERT INTO orders (table_id, user_id, items, total, paid) VALUES ($1,$2,$3,$4,false) RETURNING id, paid`,
      [table_id, req.user.id ?? null, JSON.stringify(items), total]
    );
    res.json({ id: rows[0].id, table_id, total, paid: rows[0].paid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Список заказов (по этажу опционально)
ordersRouter.get("/", authRequired, async (req, res) => {
  try {
    const { floor } = req.query;
    let sql = `SELECT o.*, t.floor, t.number as table_number FROM orders o JOIN tables t ON o.table_id = t.id`;
    const params = [];
    if (req.user.role === "waiter") {
      sql += ` WHERE t.floor = $1`;
      params.push(req.user.floor);
    } else if (floor) {
      sql += ` WHERE t.floor = $1`;
      params.push(floor);
    }
    sql += ` ORDER BY o.created_at DESC`;
    const { rows } = await pool.query(sql, params);
    res.json(rows.map(r => ({ ...r, items: Array.isArray(r.items) ? r.items : JSON.parse(r.items) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Оплата заказа
ordersRouter.patch("/:id/pay", authRequired, async (req, res) => {
  try {
    const result = await pool.query(`UPDATE orders SET paid=true WHERE id=$1`, [req.params.id]);
    res.json({ updated: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Текстовый чек
ordersRouter.get("/:id/receipt", authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, t.number as table_number, t.floor, u.name as waiter_name
       FROM orders o
       JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    const o = rows[0];
    if (!o) return res.status(404).send("Не найдено");
    const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items);
    const lines = [];
    lines.push("*** CBar Receipt ***");
    lines.push(`Table: ${o.floor.toUpperCase()}-${o.table_number}`);
    if (o.waiter_name) lines.push(`Waiter: ${o.waiter_name}`);
    lines.push(`Date: ${new Date(o.created_at).toLocaleString()}`);
    lines.push("------------------------------");
    for (const it of items) {
      lines.push(`${it.name} x${it.qty}  ${it.price} = ${it.price * it.qty}`);
    }
    lines.push("------------------------------");
    lines.push(`TOTAL: ${o.total}`);
    lines.push(o.paid ? "PAID" : "UNPAID");
    res.type("text/plain").send(lines.join("\n"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление заказа (только админ)
ordersRouter.delete("/:id", authRequired, only("admin"), async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM orders WHERE id=$1`, [req.params.id]);
    res.json({ deleted: r.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить все заказы (только админ)
ordersRouter.delete("/", authRequired, only("admin"), async (_req, res) => {
  try {
    await pool.query(`DELETE FROM orders`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
