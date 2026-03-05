"use client";

import { useState } from "react";

export default function Home() {
  const [classCode, setClassCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [tutorReply, setTutorReply] = useState("");

  async function handleStart() {
    setLoading(true);
    setTutorReply("");

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classCode,
          nickname,
          problem,
          studentMessage: "help",
        }),
      });

      const data = await res.json();
      setTutorReply(data.content || JSON.stringify(data, null, 2));
    } catch (err) {
      setTutorReply("Error calling tutor API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>ClearStep</h1>

      <p style={{ marginBottom: "30px" }}>
        An interactive math reasoning coach that guides students step-by-step without giving away full solutions.
      </p>

      <div style={{ maxWidth: "520px" }}>
        <label>Class Code</label>
        <input
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          type="text"
          placeholder="Enter class code"
          style={{ width: "100%", padding: "8px", marginTop: "5px", marginBottom: "15px" }}
        />

        <label>Nickname</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          type="text"
          placeholder="Enter nickname"
          style={{ width: "100%", padding: "8px", marginTop: "5px", marginBottom: "15px" }}
        />

        <label>Math Problem (type or paste)</label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Example: 3x + 5 = 20"
          rows={4}
          style={{ width: "100%", padding: "8px", marginTop: "5px", marginBottom: "20px" }}
        />

        <button
          onClick={handleStart}
          disabled={loading || !problem.trim()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#111",
            color: "white",
            border: "none",
            cursor: "pointer",
            opacity: loading || !problem.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Starting..." : "Start"}
        </button>

        {tutorReply && (
          <div style={{ marginTop: "30px" }}>
            <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Tutor</h2>
            <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#fff", padding: "12px" }}>
              {tutorReply}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
