import { Router, Request, Response } from "express";
import { query, healthCheck } from "../db.js";

const router = Router();

/**
 * GET /api/health — health check proving backend + team-db are connected
 */
router.get("/health", async (_req: Request, res: Response) => {
  const dbHealth = await healthCheck();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: dbHealth,
  });
});

/**
 * GET /api/hello — simple hello world proving frontend can talk to backend
 */
router.get("/hello", (_req: Request, res: Response) => {
  res.json({
    message: "Hello from Try One Thing backend!",
    team: "agent-engineer",
  });
});

/**
 * GET /api/tasks — list tasks from the shared task board (for verification)
 */
router.get("/tasks", async (_req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT id, title, status, assigned_to FROM tasks ORDER BY created_at"
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

export default router;