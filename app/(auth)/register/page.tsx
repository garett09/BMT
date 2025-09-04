"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";

const emailSchema = z.string().email();

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const isValidEmail = emailSchema.safeParse(email).success;
    if (!isValidEmail) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (res.ok) {
      window.location.href = "/login";
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Registration failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#0f172a] to-[#0b1023] text-white">
      <div className="w-full max-w-sm rounded-2xl border card p-5 shadow-xl">
        <h1 className="text-2xl font-semibold text-center mb-1">Create account</h1>
        <p className="text-center text-sm text-[var(--muted)] mb-4">Start tracking your money</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded-md border px-3 py-2 text-base bg-transparent"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-base bg-transparent"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => {
              if (!emailSchema.safeParse(email).success) {
                setError("Please enter a valid email address");
              } else if (error) {
                setError(null);
              }
            }}
            required
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-base bg-transparent"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            className="w-full rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 py-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="text-center mt-3 text-sm text-[var(--muted)]">
          Already have an account? <Link className="underline" href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}


