import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? await verifyJwt(token) : null;
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4">
        <h1 className="text-xl font-semibold">Buni Money Tracker</h1>
        {!payload ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm">Track your income and expenses on the go.</p>
            <div className="flex gap-2">
              <Button href="/login">Login</Button>
              <Button href="/register" variant="secondary">Register</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-sm">
            <p>Welcome back, {payload?.name || payload?.email}.</p>
            <div className="flex gap-2">
              <Button href="/dashboard">Dashboard</Button>
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
