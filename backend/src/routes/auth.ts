import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { generateToken, AuthRequest, requireAuth } from "../middleware/auth.js";
import { randomUUID } from "node:crypto";

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new coach account
 */
router.post("/signup", async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    // Check if email already exists
    const existing = await query(
      `SELECT id FROM coaches WHERE email = '${email.replace(/'/g, "''")}' LIMIT 1`
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO coaches (id, name, email, password_hash) VALUES ('${id}', '${name.replace(/'/g, "''")}', '${email.replace(/'/g, "''")}', '${hashedPassword}')`
    );

    const token = generateToken(id, email);
    res.status(201).json({
      token,
      coach: { id, name, email },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a coach and return a JWT
 */
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const result = await query(
      `SELECT id, name, email, password_hash FROM coaches WHERE email = '${email.replace(/'/g, "''")}' LIMIT 1`
    );
    const coach = result.rows[0] as { id: string; name: string; email: string; password_hash: string } | undefined;
    if (!coach) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, coach.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken(coach.id, coach.email);
    res.json({
      token,
      coach: { id: coach.id, name: coach.name, email: coach.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/auth/me
 * Return the currently authenticated coach's profile
 */
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, email, created_at FROM coaches WHERE id = '${req.coachId}' LIMIT 1`
    );
    const coach = result.rows[0] as { id: string; name: string; email: string; created_at: string } | undefined;
    if (!coach) {
      res.status(404).json({ error: "Coach not found" });
      return;
    }
    res.json({ coach });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
