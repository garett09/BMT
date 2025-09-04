"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { redirect: false, email, password });
    if (!res || res.error) setError("Invalid credentials");
    else window.location.href = "/dashboard";
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#0f172a] to-[#0b1023] text-white">
      <div className="w-full max-w-sm rounded-2xl border card p-5 shadow-xl">
        <h1 className="text-2xl font-semibold text-center mb-1">Welcome back</h1>
        <p className="text-center text-sm text-[var(--muted)] mb-4">Sign in to continue tracking</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded-md border px-3 py-2 text-base bg-transparent"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-base bg-transparent"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            className="w-full rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 py-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-center mt-3 text-sm text-[var(--muted)]">
          No account? <Link className="underline" href="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}


