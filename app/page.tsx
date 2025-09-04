import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HeroBanner } from "@/components/ui/HeroBanner";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    // Redirect authenticated users to dashboard
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#0f172a] to-[#0b1023] text-white">
        <meta httpEquiv="refresh" content="0; url=/dashboard" />
        <p className="text-sm text-[var(--muted)]">Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-[#0f172a] to-[#0b1023] text-white">
      <main className="flex-1 p-6 max-w-md mx-auto w-full space-y-4">
        <HeroBanner title="Buni Money Tracker" subtitle="Smarter budgets. Clearer insights. Mobile-first." color="#6366f1" />
        <div className="rounded-2xl border card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)]">Start tracking today</div>
              <div className="text-lg font-semibold">Create budgets, log expenses, and visualize trends.</div>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button href="/login" className="bg-gradient-to-r from-indigo-500 to-purple-500">Login</Button>
              <Button href="/register" variant="secondary">Register</Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-md border p-3">
              <div className="font-semibold">Fast</div>
              <div className="text-[var(--muted)]">Quick add actions</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-semibold">Insightful</div>
              <div className="text-[var(--muted)]">Trends & KPIs</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="font-semibold">Secure</div>
              <div className="text-[var(--muted)]">Protected sessions</div>
            </div>
          </div>
        </div>
      </main>
      <nav className="sticky bottom-0 border-t bg-background">
        <div className="grid grid-cols-2 max-w-md mx-auto">
          <Link href="/login" className="p-3 text-center text-sm">Login</Link>
          <Link href="/register" className="p-3 text-center text-sm">Register</Link>
        </div>
      </nav>
    </div>
  );
}
