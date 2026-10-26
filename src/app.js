import "./config.js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import contactRouter from "./routes/contact.js";
import projectsRouter from "./routes/projects.js";

const app = express();
const allowedOrigins = (
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/projects", projectsRouter);
app.use("/api/contact", contactRouter);

app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);

  const status = err.message === "Origin not allowed by CORS" ? 403 : 500;
  if (status === 500) console.error("Unhandled API error:", err);
  return res.status(status).json({
    error: status === 403 ? "Origin not allowed" : "Internal server error",
  });
});

export default app;