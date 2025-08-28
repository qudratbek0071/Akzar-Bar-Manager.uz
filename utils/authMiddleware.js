// /utils/authMiddleware.js
import jwt from "jsonwebtoken";
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";

export function signToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "12h" });
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Нет токена" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(401).json({ error: "Неверный токен" });
    req.user = user;
    next();
  });
}

export function only(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: "Нет доступа" });
    next();
  };
}
