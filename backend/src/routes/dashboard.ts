import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { query, createClient, getClientsByCoach, getActiveCycle, getClientBank } from "../db.js";
import { randomUUID } from "node:crypto";

const router = Router();

// All dashboard routes require authentication
router.use(requireAuth);

/**
 * GET /api/dashboard
 * Returns coach info + clients with their current cycle status
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const coachResult = await query(
      `SELECT id, name, email, created_at FROM coaches WHERE id = '${req.coachId}' LIMIT 1`
    );
    const coach = coachResult.rows[0] as { id: string; name: string; email: string; created_at: string } | undefined;

    const clients = await getClientsByCoach(req.coachId!);

    // Enrich each client with their active cycle and bank count
    const enrichedClients = await Promise.all(
      clients.map(async (c) => {
        const activeCycle = await getActiveCycle(req.coachId!, c.id);
        const bankCycles = await getClientBank(req.coachId!, c.id);
        return {
          ...c,
          activeCycle: activeCycle
            ? {
                id: activeCycle.id,
                change: activeCycle.change,
                stage: activeCycle.stage,
                checkInCount: activeCycle.check_in_count,
                createdAt: activeCycle.created_at,
              }
            : null,
          completedCycles: bankCycles.length,
        };
      })
    );

    res.json({
      coach,
      clients: enrichedClients,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

/**
 * POST /api/dashboard/clients
 * Add a new client for this coach
 */
router.post("/clients", async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    if (!name) {
      res.status(400).json({ error: "Client name is required" });
      return;
    }

    const id = randomUUID();
    const client = await createClient(id, req.coachId!, name, email);
    res.status(201).json({ client });
  } catch (err) {
    console.error("Create client error:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

/**
 * GET /api/dashboard/clients/:clientId/cycles
 * Get all cycles for a specific client
 */
router.get("/clients/:clientId/cycles", async (req: AuthRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await query(
      `SELECT * FROM cycles WHERE coach_id = '${req.coachId}' AND client_id = '${clientId}' ORDER BY created_at DESC`
    );
    res.json({ cycles: result.rows });
  } catch (err) {
    console.error("Get cycles error:", err);
    res.status(500).json({ error: "Failed to fetch cycles" });
  }
});

/**
 * POST /api/dashboard/cycles
 * Start a new change cycle for a client
 */
router.post("/cycles", async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, change } = req.body;
    if (!clientId || !change) {
      res.status(400).json({ error: "clientId and change are required" });
      return;
    }

    // Check no active cycle already exists
    const active = await getActiveCycle(req.coachId!, clientId);
    if (active) {
      res.status(409).json({ error: "Client already has an active cycle. Complete it before starting a new one." });
      return;
    }

    // Import the createCycle function
    const { createCycle } = await import("../db.js");
    const id = randomUUID();
    const cycle = await createCycle(id, req.coachId!, clientId, change);
    res.status(201).json({ cycle });
  } catch (err) {
    console.error("Create cycle error:", err);
    res.status(500).json({ error: "Failed to create cycle" });
  }
});

export default router;
