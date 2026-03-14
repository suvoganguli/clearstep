"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "student" | "tutor";
  content: string;
  finalCorrect?: boolean;
};

export default function Home() {
  const [isDone, setIsDone] = useState(false);

  // ---- Login / session info
  const [classCode, setClassCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [started, setStarted] = useState(false);

  // ---- Tutor state
  const [problem, setProblem] = useState("3x + 5 = 20");
  const [studentInput, setStudentInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // ---- Auto-scroll
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ---- Problem State
  const [problemState, setProblemState] = useState<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    // Reset tutor session when problem text changes
    setMessages([]);
    setStudentInput("");
    setErrorText(null);
    setLoading(false);
    setIsDone(false);
  }, [problem]);

  const canStart = useMemo(() => {
    return classCode.trim().length > 0 && nickname.trim().length > 0;
  }, [classCode, nickname]);

  async function sendMessage() {
    const msg = studentInput.trim();
    if (!msg) return;

    // ---- Step B: if problem finished, allow "yes/new" to reset
    if (isDone) {
      const m = msg.toLowerCase();

      const wantsNew =
        m === "yes" ||
        m === "y" ||
        m === "new" ||
        m === "new problem" ||
        m === "another" ||
        m === "another one" ||
        m === "next";

      if (wantsNew) {
        setStudentInput("");
        newProblem();
        return;
      }
    }

    setErrorText(null);

    // Add student message
    const studentMsg: ChatMessage = { role: "student", content: msg };
    const nextMessages = [...messages, studentMsg];
    setMessages(nextMessages);
    setStudentInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem,
          studentMessage: msg,
          state: problemState,
          history: nextMessages.map((m) => ({
            role: m.role === "student" ? "user" : "assistant",
            content: m.content,
          })),
          // classCode, nickname can be sent later if you want
        }),
      });

      const data = await res.json();
      if (data.problemState) {
        setProblemState(data.problemState);
      }
      const solved = data?.status === "solved";

      if (solved) {
        setIsDone(true);
      }

      if (!res.ok) {
        setErrorText(data?.error || "Server error.");
        setMessages((prev) => [
          ...prev,
          {
            role: "tutor",
            content: "Sorry — something went wrong on the server.",
          },
        ]);
        return;
      }

      const tutorText =
        typeof data?.content === "string" && data.content.trim().length > 0
          ? data.content
          : "I didn’t understand that. Try again.";

      const finalTutorText = solved
        ? `${tutorText}\n\nWould you like to try a new problem? Type yes to continue.`
        : tutorText;

      setMessages((prev) => [
        ...prev,
        {
          role: "tutor",
          content: finalTutorText,
          finalCorrect: solved,
        },
      ]);
    } catch {
      setErrorText("Network error.");
      setMessages((prev) => [
        ...prev,
        { role: "tutor", content: "Sorry — I couldn’t reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  }

  function newProblem() {
    setMessages([]);
    setStudentInput("");
    setErrorText(null);
    setLoading(false);
    setIsDone(false);
    setProblemState(null);
  }

  // ---- Screen 1: Class Code + Nickname
  if (!started) {
    return (
      <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>ClearStep</h1>

        <p style={{ marginBottom: "30px", maxWidth: "640px" }}>
          An interactive math reasoning coach that guides students step-by-step
          without giving away full solutions.
        </p>

        <div style={{ maxWidth: "420px" }}>
          <label style={{ display: "block", marginBottom: "6px" }}>
            Class Code
          </label>
          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="Enter class code"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "16px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />

          <label style={{ display: "block", marginBottom: "6px" }}>
            Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter nickname"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />

          <button
            onClick={() => setStarted(true)}
            disabled={!canStart}
            style={{
              padding: "10px 20px",
              backgroundColor: canStart ? "#111" : "#999",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: canStart ? "pointer" : "not-allowed",
              width: "100%",
            }}
          >
            Start
          </button>
        </div>
      </main>
    );
  }

  // ---- Screen 2: Tutor chat
  return (
    <main
      style={{
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "980px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "16px",
        }}
      >
        <h1 style={{ fontSize: "28px", margin: 0 }}>ClearStep</h1>
        <div style={{ color: "#555" }}>
          <span style={{ marginRight: "12px" }}>
            Class: <b>{classCode}</b>
          </span>
          <span>
            User: <b>{nickname}</b>
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "10px",
        }}
      >
        <button
          onClick={() => {
            setMessages([]);
            setStudentInput("");
            setErrorText(null);
            setLoading(false);
            setIsDone(false);
            setProblemState(null);
          }}
          style={{
            marginTop: "6px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#111",
            color: "#fff",
            fontWeight: 500,
            cursor: "pointer",
            width: "140px",
          }}
        >
          New Problem
        </button>

        <label style={{ fontWeight: 600 }}>Problem</label>

        <input
          type="text"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Enter a linear equation like 3x + 5 = 20"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />

        <div style={{ color: "#666", fontSize: "13px" }}>
          Phase 1 supports linear equations like <code>ax + b = c</code> with
          integers.
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          height: "60vh",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          padding: "14px",
          overflowY: "auto",
          background: "#fafafa",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: "#666" }}>
            Type your first step below. Example: <code>subtract 5</code> or{" "}
            <code>15</code>.
          </div>
        ) : null}

        {messages.map((m, i) => {
          const isStudent = m.role === "student";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isStudent ? "flex-end" : "flex-start",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: isStudent ? "#111" : "#fff",
                  color: isStudent ? "#fff" : "#111",
                  border: isStudent ? "none" : "1px solid #e6e6e6",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.35,
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.75,
                    marginBottom: "4px",
                  }}
                >
                  {isStudent ? nickname : "Tutor"}
                </div>

                {m.finalCorrect && (
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      background: "#22c55e",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "6px",
                      boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
                    }}
                  >
                    <span
                      style={{
                        color: "white",
                        fontSize: "24px",
                        fontWeight: "bold",
                      }}
                    >
                      ✓
                    </span>
                  </div>
                )}

                {m.content}
              </div>
            </div>
          );
        })}

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 12px",
                borderRadius: "12px",
                background: "#fff",
                border: "1px solid #e6e6e6",
                color: "#111",
              }}
            >
              <div
                style={{ fontSize: "12px", opacity: 0.75, marginBottom: "4px" }}
              >
                Tutor
              </div>
              Thinking…
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {errorText ? (
        <div style={{ marginTop: "10px", color: "#b00020" }}>{errorText}</div>
      ) : null}

      <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={studentInput}
          onChange={(e) => setStudentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Enter your next step (e.g., "15" or "x=5")'
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !studentInput.trim()}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "none",
            cursor: loading || !studentInput.trim() ? "not-allowed" : "pointer",
            background: loading || !studentInput.trim() ? "#999" : "#111",
            color: "#fff",
            minWidth: "110px",
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
}
