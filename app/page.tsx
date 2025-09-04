import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4">
        <h1 className="text-xl font-semibold">Buni Money Tracker</h1>
        {!session ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm">Track your income and expenses on the go.</p>
            <div className="flex gap-2">
              <Link className="px-4 py-2 rounded-md bg-black text-white" href="/login">Login</Link>
              <Link className="px-4 py-2 rounded-md border" href="/register">Register</Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-sm">
            <p>Welcome back, {session.user?.name || session.user?.email}.</p>
            <div className="flex gap-2">
              <Link className="px-4 py-2 rounded-md bg-black text-white" href="/dashboard">Dashboard</Link>
              <Link className="px-4 py-2 rounded-md border" href="/transactions">Transactions</Link>
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
