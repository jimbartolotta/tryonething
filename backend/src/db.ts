/**
 * team-db integration for the Try One Thing backend.
 *
 * Provides a thin wrapper around the shared team-db CLI for database access,
 * plus CRUD helpers for the core data model.
 */

import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Coach {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Client {
  id: string;
  coach_id: string;
  name: string;
  email: string | null;
  created_at: string;
}

export interface Cycle {
  id: string;
  coach_id: string;
  client_id: string;
  change: string;
  stage: "commit" | "track" | "gauge" | "verdict" | "bank";
  verdict: "keep" | "drop" | "modify" | null;
  check_in_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface CheckIn {
  id: string;
  cycle_id: string;
  note: string;
  rating: number;
  created_at: string;
}

export interface DBResult {
  rows: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Low-level query helper
// ---------------------------------------------------------------------------

/**
 * Execute a SQL statement via the team-db CLI and return parsed JSON results.
 */
export function query(sql: string): Promise<DBResult> {
  try {
    // Escape: double quotes (SQL), backticks, and dollar signs (bash expansion)
    const escaped = sql
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$");
    const output = execSync(`team-db "${escaped}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return Promise.resolve({
      rows: JSON.parse(output) as Record<string, unknown>[],
    });
  } catch (err) {
    console.error("team-db query failed:", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export async function healthCheck(): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await query("SELECT 1 as alive");
    const alive = result.rows?.[0]?.alive === 1;
    return {
      ok: alive,
      message: alive
        ? "team-db connected"
        : "team-db returned unexpected result",
    };
  } catch (err) {
    return { ok: false, message: `team-db error: ${(err as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

export async function createCoach(
  id: string,
  name: string,
  email: string
): Promise<Coach> {
  await query(
    `INSERT INTO coaches (id, name, email) VALUES ('${id}', '${name.replace(/'/g, "''")}', '${email.replace(/'/g, "''")}')`
  );
  return { id, name, email, created_at: new Date().toISOString() };
}

export async function getCoachByEmail(email: string): Promise<Coach | null> {
  const result = await query(
    `SELECT * FROM coaches WHERE email = '${email.replace(/'/g, "''")}' LIMIT 1`
  );
  return (result.rows[0] as Coach) ?? null;
}

export async function getCoachById(id: string): Promise<Coach | null> {
  const result = await query(
    `SELECT * FROM coaches WHERE id = '${id}' LIMIT 1`
  );
  return (result.rows[0] as Coach) ?? null;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function createClient(
  id: string,
  coachId: string,
  name: string,
  email?: string
): Promise<Client> {
  const emailVal = email ? `'${email.replace(/'/g, "''")}'` : "NULL";
  await query(
    `INSERT INTO clients (id, coach_id, name, email) VALUES ('${id}', '${coachId}', '${name.replace(/'/g, "''")}', ${emailVal})`
  );
  return {
    id,
    coach_id: coachId,
    name,
    email: email ?? null,
    created_at: new Date().toISOString(),
  };
}

export async function getClientsByCoach(coachId: string): Promise<Client[]> {
  const result = await query(
    `SELECT * FROM clients WHERE coach_id = '${coachId}' ORDER BY created_at DESC`
  );
  return result.rows as Client[];
}

export async function getClientById(id: string): Promise<Client | null> {
  const result = await query(
    `SELECT * FROM clients WHERE id = '${id}' LIMIT 1`
  );
  return (result.rows[0] as Client) ?? null;
}

// ---------------------------------------------------------------------------
// Cycles
// ---------------------------------------------------------------------------

export async function createCycle(
  id: string,
  coachId: string,
  clientId: string,
  change: string
): Promise<Cycle> {
  await query(
    `INSERT INTO cycles (id, coach_id, client_id, change) VALUES ('${id}', '${coachId}', '${clientId}', '${change.replace(/'/g, "''")}')`
  );
  return {
    id,
    coach_id: coachId,
    client_id: clientId,
    change,
    stage: "commit",
    verdict: null,
    check_in_count: 0,
    created_at: new Date().toISOString(),
    completed_at: null,
  };
}

/** Get the active (not banked) cycle for a coach+client pair */
export async function getActiveCycle(
  coachId: string,
  clientId: string
): Promise<Cycle | null> {
  const result = await query(
    `SELECT * FROM cycles WHERE coach_id = '${coachId}' AND client_id = '${clientId}' AND stage != 'bank' ORDER BY created_at DESC LIMIT 1`
  );
  return (result.rows[0] as Cycle) ?? null;
}

export async function getCycleById(id: string): Promise<Cycle | null> {
  const result = await query(
    `SELECT * FROM cycles WHERE id = '${id}' LIMIT 1`
  );
  return (result.rows[0] as Cycle) ?? null;
}

/** Advance a cycle to the next stage */
export async function updateCycleStage(
  id: string,
  stage: Cycle["stage"]
): Promise<void> {
  await query(
    `UPDATE cycles SET stage = '${stage}' WHERE id = '${id}'`
  );
}

/** Complete a cycle with a verdict and move to bank */
export async function completeCycle(
  id: string,
  verdict: "keep" | "drop" | "modify"
): Promise<void> {
  await query(
    `UPDATE cycles SET stage = 'bank', verdict = '${verdict}', completed_at = datetime('now') WHERE id = '${id}'`
  );
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export async function addCheckIn(
  id: string,
  cycleId: string,
  note: string,
  rating: number
): Promise<CheckIn> {
  await query(
    `INSERT INTO check_ins (id, cycle_id, note, rating) VALUES ('${id}', '${cycleId}', '${note.replace(/'/g, "''")}', ${rating})`
  );
  // Increment check_in_count on the parent cycle
  await query(
    `UPDATE cycles SET check_in_count = check_in_count + 1, stage = 'track' WHERE id = '${cycleId}' AND stage = 'commit'`
  );
  return {
    id,
    cycle_id: cycleId,
    note,
    rating,
    created_at: new Date().toISOString(),
  };
}

export async function getCheckInsByCycle(cycleId: string): Promise<CheckIn[]> {
  const result = await query(
    `SELECT * FROM check_ins WHERE cycle_id = '${cycleId}' ORDER BY created_at DESC`
  );
  return result.rows as CheckIn[];
}

// ---------------------------------------------------------------------------
// Bank (completed cycles history)
// ---------------------------------------------------------------------------

export async function getBank(coachId: string): Promise<Cycle[]> {
  const result = await query(
    `SELECT * FROM cycles WHERE coach_id = '${coachId}' AND stage = 'bank' ORDER BY completed_at DESC`
  );
  return result.rows as Cycle[];
}

export async function getClientBank(
  coachId: string,
  clientId: string
): Promise<Cycle[]> {
  const result = await query(
    `SELECT * FROM cycles WHERE coach_id = '${coachId}' AND client_id = '${clientId}' AND stage = 'bank' ORDER BY completed_at DESC`
  );
  return result.rows as Cycle[];
}