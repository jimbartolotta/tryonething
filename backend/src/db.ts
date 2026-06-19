/**
 * team-db integration for the Try One Thing backend.
 * 
 * Provides a thin wrapper around the shared team-db CLI for database access.
 * In production, this delegates to the `team-db` CLI. For local dev, it can
 * use an in-memory fallback or the same CLI.
 */

import { execSync } from "node:child_process";

export interface DBResult {
  rows: Record<string, unknown>[];
}

/**
 * Execute a SQL statement via the team-db CLI and return parsed JSON results.
 */
export function query(sql: string): Promise<DBResult> {
  try {
    const output = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return Promise.resolve({ rows: JSON.parse(output) as Record<string, unknown>[] });
  } catch (err) {
    console.error("team-db query failed:", err);
    throw err;
  }
}

/**
 * Health check — verify team-db is accessible.
 */
export async function healthCheck(): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await query("SELECT 1 as alive");
    const alive = result.rows?.[0]?.alive === 1;
    return { ok: alive, message: alive ? "team-db connected" : "team-db returned unexpected result" };
  } catch (err) {
    return { ok: false, message: `team-db error: ${(err as Error).message}` };
  }
}