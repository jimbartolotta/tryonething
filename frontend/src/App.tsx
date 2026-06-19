import React, { useEffect, useState } from "react";
import { getHealth, getHello, getTasks } from "./api";

type ConnectionStatus = "loading" | "connected" | "error";

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [helloMsg, setHelloMsg] = useState("");
  const [dbStatus, setDbStatus] = useState("");
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string }[]>([]);

  useEffect(() => {
    async function check() {
      try {
        const [health, hello, taskData] = await Promise.all([
          getHealth(),
          getHello(),
          getTasks(),
        ]);

        setHelloMsg(hello.message);
        setDbStatus(
          health.db.ok ? "✅ Database connected" : "❌ Database error"
        );
        setTasks(taskData);
        setStatus("connected");
      } catch (err) {
        setStatus("error");
        console.error("Connection check failed:", err);
      }
    }
    check();
  }, []);

  return (
    <div style={{ maxWidth: "640px", margin: "40px auto", fontFamily: "system-ui, sans-serif", padding: "0 20px" }}>
      <h1>Try One Thing</h1>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        An opinionated change methodology for depth coaches.
      </p>

      <section
        style={{
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          background: status === "connected" ? "#f0fdf4" : status === "error" ? "#fef2f2" : "#f9fafb",
        }}
      >
        <h2 style={{ margin: "0 0 12px" }}>Backend Connection</h2>

        {status === "loading" && <p>Connecting to backend...</p>}
        {status === "error" && <p style={{ color: "#dc2626" }}>Could not connect to backend.</p>}
        {status === "connected" && (
          <>
            <p><strong>Message:</strong> {helloMsg}</p>
            <p><strong>DB Status:</strong> {dbStatus}</p>
          </>
        )}
      </section>

      {tasks.length > 0 && (
        <section style={{ marginTop: "24px" }}>
          <h2>Team Tasks</h2>
          <ul style={{ padding: 0, listStyle: "none" }}>
            {tasks.map((t) => (
              <li
                key={t.id}
                style={{
                  padding: "8px 12px",
                  marginBottom: "4px",
                  background: "#f9fafb",
                  borderRadius: "4px",
                  border: "1px solid #eee",
                }}
              >
                <strong>{t.title}</strong> <span style={{ color: "#666" }}>({t.status})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer
        style={{
          marginTop: "48px",
          paddingTop: "16px",
          borderTop: "1px solid #eee",
          fontSize: "12px",
          color: "#999",
        }}
      >
        <p>
          <strong>Methodology:</strong> Commit → Track → Gauge → Verdict → Bank
        </p>
        <p>No streaks. No gamification. Honest verdicts only.</p>
      </footer>
    </div>
  );
}