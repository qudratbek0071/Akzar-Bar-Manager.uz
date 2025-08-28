// /routes/reports.js
import { Router } from "express";
import { pool } from "../models/db.js";
import { authRequired } from "../utils/authMiddleware.js";

export const reportsRouter = Router();

// Дневной отчёт (сумма продаж и кол-во заказов)
reportsRouter.get("/daily", authRequired, async (req, res) => {
  try {
    const sql = `
      SELECT date(o.created_at) as day,
             SUM(o.total) as total_sales,
             COUNT(*) as orders_count,
             SUM(CASE WHEN o.paid = false THEN o.total ELSE 0 END) as unpaid_total
      FROM orders o
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Неоплаченные заказы
reportsRouter.get("/unpaid", authRequired, async (req, res) => {
  try {
    const sql = `SELECT o.*, t.floor, t.number as table_number
                 FROM orders o JOIN tables t ON o.table_id=t.id
                 WHERE o.paid = false
                 ORDER BY o.created_at DESC`;
    const { rows } = await pool.query(sql);
    res.json(rows.map(r => ({ ...r, items: Array.isArray(r.items) ? r.items : JSON.parse(r.items) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Лидерборд продаж по официантам
reportsRouter.get("/leaderboard", authRequired, async (req, res) => {
  try {
    const { from, to } = req.query; // ISO dates optional
    const params = [];
    let filter = "";
    if (from) { params.push(from); filter += ` AND o.created_at >= $${params.length}`; }
    if (to) { params.push(to); filter += ` AND o.created_at <= $${params.length}`; }
    const sql = `
      SELECT u.id, u.name, COALESCE(SUM(o.total),0) as total_sales, COUNT(o.id) as orders_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.paid = true${filter}
      WHERE u.role IN ('waiter','admin','boss')
      GROUP BY u.id, u.name
      ORDER BY total_sales DESC, orders_count DESC
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Отчёт по заёмам (сколько взяли и не вернули)
reportsRouter.get("/borrowed", authRequired, async (_req, res)=>{
  try{
    const sql = `
      SELECT u.name as user_name, m.name as product_name, b.qty, b.returned_qty, (b.qty - b.returned_qty) as outstanding
      FROM borrow_entries b
      JOIN users u ON u.id = b.user_id
      JOIN menu m ON m.id = b.product_id
      ORDER BY outstanding DESC, b.created_at DESC`;
    const { rows } = await pool.query(sql);
    res.json(rows);
  }catch(err){ res.status(500).json({ error: err.message }); }
});

// Сколько продано по товарам (qty и сумма), период optional: from,to (YYYY-MM-DD)
reportsRouter.get("/sales-by-product", authRequired, async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = [];
    let where = " WHERE 1=1 ";
    if (from) { params.push(from); where += ` AND date(o.created_at) >= $${params.length}`; }
    if (to) { params.push(to); where += ` AND date(o.created_at) <= $${params.length}`; }
    // По умолчанию — за сегодня
    if (!from && !to) where += " AND date(o.created_at) = current_date";
    const sql = `
      SELECT COALESCE(m.name, oi->>'name') as name,
             SUM((oi->>'qty')::int) as qty,
             SUM(((oi->>'qty')::int) * ((oi->>'price')::int)) as amount
      FROM orders o
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.items,'[]'::jsonb)) oi
      LEFT JOIN menu m ON m.id = (oi->>'productId')::int
      ${where}
      GROUP BY COALESCE(m.name, oi->>'name')
      ORDER BY qty DESC, amount DESC`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
