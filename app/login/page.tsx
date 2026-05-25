// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(from);
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FAF7F2",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 24px rgba(31,26,20,0.08)",
          width: "100%",
          maxWidth: "380px",
          borderTop: "4px solid #E07A3C",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1F1A14",
            marginBottom: "8px",
          }}
        >
          1915 South
        </h1>
        <p style={{ fontSize: "13px", color: "#5A4F42", marginBottom: "24px" }}>
          Workflow Prototyper — enter password to continue
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #E8DFD0",
              borderRadius: "6px",
              marginBottom: "12px",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <p style={{ color: "#B5483A", fontSize: "12px", marginBottom: "12px" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              fontWeight: 600,
              color: "white",
              background: "#E07A3C",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !password ? 0.6 : 1,
            }}
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}