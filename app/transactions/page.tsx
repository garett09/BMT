"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="p-4 space-y-4">
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
        <button className="rounded-md bg-black text-white py-2 col-span-2">Add</button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="text-sm font-medium">{t.category} • {t.type}</div>
                <div className="text-xs text-muted-foreground">{t.date}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>₱{t.amount.toLocaleString()}</div>
                <button onClick={() => delTx(t.id)} className="text-xs underline">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


