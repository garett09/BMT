"use client";
import { useEffect, useState } from "react";

type SavingsGoal = { id: string; name: string; targetAmount: number; currentAmount: number; dueDate?: string };

export default function SavingsPage() {
  const [list, setList] = useState<SavingsGoal[]>([]);
  const [form, setForm] = useState<SavingsGoal>({ id: "", name: "", targetAmount: 0, currentAmount: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/savings", { cache: "no-store" });
    if (res.ok) setList(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, id: form.id || String(Date.now()), targetAmount: Number(form.targetAmount), currentAmount: Number(form.currentAmount) };
    const res = await fetch("/api/savings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setForm({ id: "", name: "", targetAmount: 0, currentAmount: 0 }); load(); }
  };

  const delItem = async (id: string) => {
    const res = await fetch(`/api/savings?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Savings Goals</h1>
        <form onSubmit={save} className="grid grid-cols-2 gap-2">
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded-md px-3 py-2" type="number" placeholder="Target" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) })} />
          <input className="border rounded-md px-3 py-2" type="number" placeholder="Current" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: Number(e.target.value) })} />
          <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <button className="rounded-md bg-black text-white py-2 col-span-2">Save</button>
        </form>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet.</p>
          ) : (
            list.map((g) => (
              <div key={g.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="text-sm font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">₱{g.currentAmount.toLocaleString()} / ₱{g.targetAmount.toLocaleString()}</div>
                </div>
                <button className="text-xs underline" onClick={() => delItem(g.id)}>Delete</button>
              </div>
            ))
          )}
        </div>
      </main>
      <nav className="sticky bottom-0 border-t bg-background">
        <div className="grid grid-cols-3 max-w-md mx-auto">
          <a href="/dashboard" className="p-3 text-center text-sm">Dashboard</a>
          <a href="/transactions" className="p-3 text-center text-sm">Transactions</a>
          <a href="/savings" className="p-3 text-center text-sm">Savings</a>
        </div>
      </nav>
    </div>
  );
}


