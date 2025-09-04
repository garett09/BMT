import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { EnhancedDashboard } from "@/components/EnhancedDashboard";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";

export default async function DashboardPage() {
  await getServerSession(authOptions); // ensure protected via middleware too
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <EnhancedDashboard />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/transactions" className="rounded-md border p-3 text-center text-sm">Manage Transactions</Link>
          <Link href="/settings" className="rounded-md border p-3 text-center text-sm">Settings</Link>
        </div>
      </main>
      <BottomNav items={[
        { href: "/dashboard", label: "Dashboard", active: true },
        { href: "/transactions", label: "Transactions" },
        { href: "/notifications", label: "Inbox" },
      ]} />
    </div>
  );
}


