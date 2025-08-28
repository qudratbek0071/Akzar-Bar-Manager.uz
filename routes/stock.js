// /routes/stock.js
import { Router } from "express";
import { pool } from "../models/db.js";
import { authRequired, only } from "../utils/authMiddleware.js";

export const stockRouter = Router();

// Ввод остатков (opening) или приход (incoming)
stockRouter.post("/", authRequired, only("admin"), async (req, res) => {
  try {
    const { product_id, qty, type } = req.body; // type: 'opening' | 'incoming' | 'adjustment'
    const { rows } = await pool.query(
      `INSERT INTO stock_entries (product_id, qty, type) VALUES ($1,$2,$3) RETURNING id`,
      [product_id, qty, type]
    );
    res.json({ id: rows[0].id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Текущий остаток по каждому товару (на основе сумм приходов - продаж)
stockRouter.get("/current", authRequired, async (req, res) => {
  try {
    const sql = `
      WITH sales AS (
        SELECT (oi->>'productId')::int as product_id,
               SUM((oi->>'qty')::int) as sold
        FROM orders o
        CROSS JOIN LATERAL jsonb_array_elements(o.items) as oi
        GROUP BY product_id
      ),
      incoming AS (
        SELECT product_id, SUM(qty) as incoming_qty
        FROM stock_entries
        GROUP BY product_id
      ),
      borrowed AS (
        SELECT product_id, SUM(qty - returned_qty) as borrowed_qty
        FROM borrow_entries
        GROUP BY product_id
      )
      SELECT m.id, m.name, m.category,
             COALESCE(i.incoming_qty, 0) - COALESCE(s.sold, 0) - COALESCE(b.borrowed_qty,0) as stock,
             COALESCE(s.sold, 0) as sold,
             COALESCE(b.borrowed_qty,0) as borrowed
      FROM menu m
      LEFT JOIN incoming i ON i.product_id = m.id
      LEFT JOIN sales s ON s.product_id = m.id
      LEFT JOIN borrowed b ON b.product_id = m.id
      ORDER BY m.category, m.name;
    `;
    const { rows } = await pool.query(sql);
    const alerts = rows.filter(r => Number(r.stock) < 3);
    res.json({ stock: rows, lowStock: alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Выдать сотруднику (заем)
stockRouter.post("/borrow", authRequired, only("admin"), async (req, res)=>{
  try{
    const { user_id, product_id, qty } = req.body;
    const r = await pool.query(`INSERT INTO borrow_entries (user_id, product_id, qty) VALUES ($1,$2,$3) RETURNING id`, [user_id, product_id, qty]);
    res.json({ id: r.rows[0].id });
  }catch(err){ res.status(400).json({ error: err.message }); }
});

// Принять возврат
stockRouter.post("/borrow/return", authRequired, only("admin"), async (req, res)=>{
  try{
    const { borrow_id, qty } = req.body;
    const r = await pool.query(`UPDATE borrow_entries SET returned_qty = returned_qty + $2 WHERE id=$1`, [borrow_id, qty]);
    res.json({ updated: r.rowCount });
  }catch(err){ res.status(400).json({ error: err.message }); }
});

// История приходов (для админа)
stockRouter.get("/entries", authRequired, only("admin"), async (req, res)=>{
  try{
    const limit = Math.min(Number(req.query.limit||50), 200);
    const sql = `SELECT se.id, se.product_id, se.qty, se.type, se.created_at, m.name as product_name
                 FROM stock_entries se JOIN menu m ON m.id = se.product_id
                 ORDER BY se.id DESC LIMIT $1`;
    const { rows } = await pool.query(sql, [limit]);
    res.json(rows);
  }catch(err){ res.status(500).json({ error: err.message }); }
});

// Обновить запись прихода (только админ)
stockRouter.put("/entries/:id", authRequired, only("admin"), async (req, res)=>{
  try{
    const { qty, type } = req.body;
    const r = await pool.query(`UPDATE stock_entries SET qty=$1, type=$2 WHERE id=$3`, [qty, type, req.params.id]);
    res.json({ updated: r.rowCount });
  }catch(err){ res.status(400).json({ error: err.message }); }
});

// Удалить запись прихода (только админ)
stockRouter.delete("/entries/:id", authRequired, only("admin"), async (req, res)=>{
  try{
    const r = await pool.query(`DELETE FROM stock_entries WHERE id=$1`, [req.params.id]);
    res.json({ deleted: r.rowCount });
  }catch(err){ res.status(400).json({ error: err.message }); }
});
