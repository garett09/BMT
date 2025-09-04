"use client";
import { useEffect, useState } from "react";

type Tx = { id: string; type: "income" | "expense"; amount: number; category: string; description?: string; date: string };

export default function SharedExpensesPage() {
  const [partnerEmail, setPartnerEmail] = useState("");
  const [list, setList] = useState<Tx[]>([]);

  const savePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/shared/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerEmail: partnerEmail || undefined }) });
    load();
  };

  const load = async () => {
    const res = await fetch("/api/shared/expenses", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setList(json.expenses || []);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Shared Expenses</h1>
        <form onSubmit={savePartner} className="grid grid-cols-2 gap-2">
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Partner email (leave empty to disable)" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} />
          <button className="rounded-md bg-black text-white py-2 col-span-2">Save</button>
        </form>

        <div className="space-y-2">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shared expenses yet.</p>
          ) : (
            list.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="text-sm font-medium">{t.category}</div>
                  <div className="text-xs text-muted-foreground">{t.date}</div>
                </div>
                <div className="text-sm font-semibold text-red-600">₱{t.amount.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </main>
      <nav className="sticky bottom-0 border-t bg-background">
        <div className="grid grid-cols-3 max-w-md mx-auto">
          <a href="/dashboard" className="p-3 text-center text-sm">Dashboard</a>
          <a href="/transactions" className="p-3 text-center text-sm">Transactions</a>
          <a href="/shared/expenses" className="p-3 text-center text-sm">Shared</a>
        </div>
      </nav>
    </div>
  );
}


