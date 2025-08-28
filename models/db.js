// /models/db.js
import pg from "pg";
// Force TLS to accept Supabase self-signed chain when needed
process.env.PGSSLMODE = process.env.PGSSLMODE || "no-verify";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED || "0";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:gqrxTUjQmWqGkQjBcskhHxCuUpPTUkVU@caboose.proxy.rlwy.net:21252/railway";

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false, require: true },
});

pool.on("connect", () => console.log("✅ PostgreSQL connected"));
pool.on("error", (err) => console.error("❌ PostgreSQL error:", err));
