import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { query, getActiveCycle, getCheckInsByCycle } from "../db.js";
import { randomUUID } from "node:crypto";

const router = Router();

// All cycle routes require authentication
router.use(requireAuth);

/**
 * POST /api/cycles — Start a new cycle (Commit stage)
 * Enforces single-active-cycle constraint at the API level.
 */
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, change } = req.body;
    if (!clientId || !change?.trim()) {
      res.status(400).json({ error: "clientId and change are required" });
      return;
    }

    // Enforce single-active-cycle: check for any non-bank cycle
    const active = await getActiveCycle(req.coachId!, clientId);
    if (active) {
      res.status(409).json({
        error: "One change per cycle. This client already has an active cycle.",
        activeCycle: { id: active.id, change: active.change, stage: active.stage },
      });
      return;
    }

    const id = randomUUID();
    const coachId = req.coachId!;

    await query(
      `INSERT INTO cycles (id, coach_id, client_id, change) VALUES ('${id}', '${coachId}', '${clientId}', '${change.replace(/'/g, "''")}')`
    );

    const cycle = await query(`SELECT * FROM cycles WHERE id = '${id}' LIMIT 1`);

    res.status(201).json({ cycle: cycle.rows[0] });
  } catch (err) {
    console.error("Create cycle error:", err);
    res.status(500).json({ error: "Failed to create cycle" });
  }
});

/**
 * GET /api/cycles/:id — Get full cycle details with check-ins
 */
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM cycles WHERE id = '${id}' AND coach_id = '${req.coachId}' LIMIT 1`
    );
    const cycle = result.rows[0];
    if (!cycle) {
      res.status(404).json({ error: "Cycle not found" });
      return;
    }

    const checkIns = await getCheckInsByCycle(id);

    res.json({ cycle, checkIns });
  } catch (err) {
    console.error("Get cycle error:", err);
    res.status(500).json({ error: "Failed to fetch cycle" });
  }
});

/**
 * POST /api/cycles/:id/checkin — Add a check-in (Track stage)
 */
router.post("/:id/checkin", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note, rating } = req.body;

    if (!note?.trim()) {
      res.status(400).json({ error: "Note is required" });
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be 1-5" });
      return;
    }

    // Verify cycle belongs to this coach and is not banked
    const cycleResult = await query(
      `SELECT id, stage FROM cycles WHERE id = '${id}' AND coach_id = '${req.coachId}' LIMIT 1`
    );
    const cycle = cycleResult.rows[0] as { id: string; stage: string } | undefined;
    if (!cycle) {
      res.status(404).json({ error: "Cycle not found" });
      return;
    }
    if (cycle.stage === "bank") {
      res.status(400).json({ error: "Cannot check in on a completed cycle" });
      return;
    }

    const checkInId = randomUUID();
    await query(
      `INSERT INTO check_ins (id, cycle_id, note, rating) VALUES ('${checkInId}', '${id}', '${note.replace(/'/g, "''")}', ${rating})`
    );

    // Increment check-in count and auto-advance stage from commit → track
    await query(
      `UPDATE cycles SET check_in_count = check_in_count + 1, stage = CASE WHEN stage = 'commit' THEN 'track' ELSE stage END WHERE id = '${id}'`
    );

    const updated = await query(`SELECT * FROM cycles WHERE id = '${id}' LIMIT 1`);

    res.json({ checkIn: { id: checkInId, note, rating }, cycle: updated.rows[0] });
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Failed to add check-in" });
  }
});

/**
 * PUT /api/cycles/:id/advance — Move to the next stage
 * commit → track → gauge → verdict
 */
router.put("/:id/advance", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, stage FROM cycles WHERE id = '${id}' AND coach_id = '${req.coachId}' LIMIT 1`
    );
    const cycle = result.rows[0] as { id: string; stage: string } | undefined;
    if (!cycle) {
      res.status(404).json({ error: "Cycle not found" });
      return;
    }

    const stageOrder = ["commit", "track", "gauge", "verdict"];
    const currentIndex = stageOrder.indexOf(cycle.stage);
    if (currentIndex === -1 || currentIndex >= stageOrder.length - 1) {
      res.status(400).json({ error: `Cannot advance from '${cycle.stage}' stage` });
      return;
    }

    const nextStage = stageOrder[currentIndex + 1];
    await query(`UPDATE cycles SET stage = '${nextStage}' WHERE id = '${id}'`);

    const updated = await query(`SELECT * FROM cycles WHERE id = '${id}' LIMIT 1`);

    res.json({ cycle: updated.rows[0] });
  } catch (err) {
    console.error("Advance stage error:", err);
    res.status(500).json({ error: "Failed to advance cycle" });
  }
});

/**
 * PUT /api/cycles/:id/verdict — Submit a verdict (bank the cycle)
 */
router.put("/:id/verdict", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { verdict } = req.body;

    if (!["keep", "drop", "modify"].includes(verdict)) {
      res.status(400).json({ error: "Verdict must be 'keep', 'drop', or 'modify'" });
      return;
    }

    const result = await query(
      `SELECT id, stage FROM cycles WHERE id = '${id}' AND coach_id = '${req.coachId}' LIMIT 1`
    );
    const cycle = result.rows[0] as { id: string; stage: string } | undefined;
    if (!cycle) {
      res.status(404).json({ error: "Cycle not found" });
      return;
    }
    if (cycle.stage === "bank") {
      res.status(400).json({ error: "Cycle already completed" });
      return;
    }

    await query(
      `UPDATE cycles SET verdict = '${verdict}', stage = 'bank', completed_at = datetime('now') WHERE id = '${id}'`
    );

    const updated = await query(`SELECT * FROM cycles WHERE id = '${id}' LIMIT 1`);

    res.json({ cycle: updated.rows[0] });
  } catch (err) {
    console.error("Verdict error:", err);
    res.status(500).json({ error: "Failed to submit verdict" });
  }
});

/**
 * PUT /api/cycles/:id/modify — Update the change description (after "modify" verdict)
 */
router.put("/:id/modify", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { change } = req.body;

    if (!change?.trim()) {
      res.status(400).json({ error: "New change description is required" });
      return;
    }

    const result = await query(
      `SELECT id, verdict, stage FROM cycles WHERE id = '${id}' AND coach_id = '${req.coachId}' LIMIT 1`
    );
    const cycle = result.rows[0] as { id: string; verdict: string; stage: string } | undefined;
    if (!cycle) {
      res.status(404).json({ error: "Cycle not found" });
      return;
    }
    if (cycle.verdict !== "modify") {
      res.status(400).json({ error: "Can only modify a cycle with 'modify' verdict" });
      return;
    }

    // Update the change and recycle back to commit/track stage
    await query(
      `UPDATE cycles SET change = '${change.replace(/'/g, "''")}', stage = 'commit', verdict = NULL, completed_at = NULL WHERE id = '${id}'`
    );

    const updated = await query(`SELECT * FROM cycles WHERE id = '${id}' LIMIT 1`);

    res.json({ cycle: updated.rows[0] });
  } catch (err) {
    console.error("Modify cycle error:", err);
    res.status(500).json({ error: "Failed to modify cycle" });
  }
});

export default router;