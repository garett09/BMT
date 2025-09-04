"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BottomNav } from "@/components/ui/BottomNav";
import { Chip } from "@/components/ui/Chip";
import { ListCard } from "@/components/ui/ListCard";
import { InlineBar } from "@/components/ui/InlineBar";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description?: string;
  date: string;
};

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "expense" as const, amount: "", category: "General", description: "", date: "" });
  const router = useRouter();

  const fetchTxs = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", { cache: "no-store" });
    if (res.ok) setTxs(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTxs(); }, []);

  const addTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setForm({ type: "expense", amount: "", category: "General", description: "", date: "" });
      fetchTxs();
    }
  };

  const delTx = async (id: string) => {
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchTxs();
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <form onSubmit={addTx} className="grid grid-cols-2 gap-2">
        <select className="border rounded-md px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input className="border rounded-md px-3 py-2" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Button type="submit" fullWidth className="col-span-2">Add</Button>
        </form>

        <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          txs.map((t) => (
            <ListCard
              key={t.id}
              left={<div className="flex items-center gap-2"><Chip tone={t.type === "income" ? "pos" : "neg"}>{t.type}</Chip><span>{t.category}</span></div>}
              sub={<InlineBar value={Math.min(100, t.amount)} max={100} color={t.type === "income" ? "#22c55e" : "#ef4444"} />}
              right={<div className={t.type === "income" ? "text-[var(--positive)]" : "text-[var(--negative)]"}>₱{t.amount.toLocaleString()}</div>}
            />
          ))
        )}
        </div>
      </main>
      <BottomNav items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/transactions", label: "Transactions", active: true },
        { href: "/notifications", label: "Inbox" },
      ]} />
    </div>
  );
}


