import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? await verifyJwt(token) : null;
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-[#0f172a] to-[#0b1023] text-white">
      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-semibold">Buni Money Tracker</h1>
        {!payload ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-[var(--muted)]">Track your income and expenses on the go.</p>
            <div className="rounded-xl border card p-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[var(--muted)]">Get started</div>
                <div className="text-lg font-semibold">Simple. Fast. Mobile-first.</div>
              </div>
              <div className="flex items-end justify-end gap-2">
                <Button href="/login" className="bg-gradient-to-r from-indigo-500 to-purple-500">Login</Button>
                <Button href="/register" variant="secondary">Register</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-sm">
            <p>Welcome back, {payload?.name || payload?.email}.</p>
            <div className="flex gap-2">
              <Button href="/dashboard" className="bg-gradient-to-r from-indigo-500 to-purple-500">Dashboard</Button>
              <Button href="/transactions" variant="secondary">Transactions</Button>
              <form action="/api/auth/logout" method="post">
                <button className="rounded-md border px-4 py-2">Logout</button>
              </form>
            </div>
          </div>
        )}
      </main>
      <nav className="sticky bottom-0 border-t bg-background">
        <div className="grid grid-cols-2 max-w-md mx-auto">
          <Link href="/dashboard" className="p-3 text-center text-sm">Dashboard</Link>
          <Link href="/transactions" className="p-3 text-center text-sm">Transactions</Link>
        </div>
      </nav>
    </div>
  );
}
