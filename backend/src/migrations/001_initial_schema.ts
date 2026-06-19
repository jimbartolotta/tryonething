/**
 * Migration 001: Initial application schema
 *
 * Creates the core tables for the Try One Thing methodology:
 *   coaches → clients → cycles → check_ins
 *
 * All statements use IF NOT EXISTS so this is safe to re-run.
 */

const MIGRATION_SQL = `
-- Coaches (the users of the tool)
CREATE TABLE IF NOT EXISTS coaches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clients (coached by a coach)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL REFERENCES coaches(id),
  name TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cycles (one change per cycle — enforced constraint is application-level)
CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL REFERENCES coaches(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  change TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'commit' CHECK (stage IN ('commit','track','gauge','verdict','bank')),
  verdict TEXT CHECK (verdict IN ('keep','drop','modify')),
  check_in_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Check-ins (tracking notes + honest gauge rating)
CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES cycles(id),
  note TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Run the migration via the team-db CLI.
 * Designed to be callable from a one-off script or import.
 */
export async function runMigration(): Promise<void> {
  // Split by semicolons and execute each statement
  const statements = MIGRATION_SQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    try {
      // Use child_process to call team-db
      const { execSync } = await import("node:child_process");
      execSync(`team-db "${stmt.replace(/"/g, '\\"')}"`, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
      console.log(`✓ Executed: ${stmt.substring(0, 60)}...`);
    } catch (err) {
      console.error(`✗ Failed: ${stmt.substring(0, 60)}...`);
      console.error(err);
    }
  }
}

// Allow running directly: npx tsx src/migrations/001_initial_schema.ts
const isMain = process.argv[1]?.includes("001_initial_schema");
if (isMain) {
  runMigration()
    .then(() => {
      console.log("Migration complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}