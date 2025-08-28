// server.js (ESM)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { initTables } from "./models/init.js";
import { authRouter } from "./routes/auth.js";
import { menuRouter } from "./routes/menu.js";
import { ordersRouter } from "./routes/orders.js";
import { reportsRouter } from "./routes/reports.js";
import { stockRouter } from "./routes/stock.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// создаём таблицы при старте
initTables().catch((e) => console.error("DB init error", e));

// маршруты
app.use("/auth", authRouter);
app.use("/menu", menuRouter);
app.use("/orders", ordersRouter);
app.use("/reports", reportsRouter);
app.use("/stock", stockRouter);

app.get("/", (_, res) => res.send("Bar API ✅"));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
