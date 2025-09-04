import { getServerSession } from "next-auth";
import { auth } from "@/lib/server-auth";

async function getStats() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/dashboard/stats`, {
    cache: "no-store",
  });
  if (!res.ok) return { income: 0, expense: 0, balance: 0, count: 0 };
  return res.json();
}

export default async function DashboardPage() {
  await getServerSession(auth); // ensure protected via middleware too
  const stats = await getStats();
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Income</div>
          <div className="text-lg font-semibold">₱{stats.income.toLocaleString()}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Expense</div>
          <div className="text-lg font-semibold">₱{stats.expense.toLocaleString()}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Balance</div>
          <div className="text-lg font-semibold">₱{stats.balance.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}


