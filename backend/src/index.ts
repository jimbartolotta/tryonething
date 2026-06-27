import express from "express";
import cors from "cors";
import apiRouter from "./routes/api.js";
import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import cyclesRouter from "./routes/cycles.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api", apiRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/cycles", cyclesRouter);

// Serve static frontend in production (built files)
app.use(express.static("../frontend/dist"));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile("index.html", { root: "../frontend/dist" }, (err) => {
    if (err) {
      res.status(404).json({ error: "Not found — frontend not built yet" });
    }
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Try One Thing backend running at http://${HOST}:${PORT}`);
  console.log(`  API:  http://${HOST}:${PORT}/api/hello`);
  console.log(`  Health: http://${HOST}:${PORT}/api/health`);
});