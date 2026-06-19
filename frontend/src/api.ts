/** API client for communicating with the Try One Thing backend */

const API_BASE = "/api";

interface HealthResponse {
  status: string;
  timestamp: string;
  db: { ok: boolean; message: string };
}

interface HelloResponse {
  message: string;
  team: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assigned_to: string | null;
}

/** Fetch health check info */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}

/** Fetch hello message */
export async function getHello(): Promise<HelloResponse> {
  const res = await fetch(`${API_BASE}/hello`);
  if (!res.ok) throw new Error(`Hello failed: ${res.status}`);
  return res.json() as Promise<HelloResponse>;
}

/** Fetch tasks from the shared task board */
export async function getTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/tasks`);
  if (!res.ok) throw new Error(`Tasks fetch failed: ${res.status}`);
  const data = (await res.json()) as { tasks: Task[] };
  return data.tasks;
}