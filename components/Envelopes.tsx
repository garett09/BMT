"use client";
import { useEffect, useMemo, useState } from "react";
import type { TransactionRecord } from "@/lib/redis";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

type EnvelopesData = Record<string, number>;

export function Envelopes({ monthISO, txs }: { monthISO: string; txs: TransactionRecord[] }) {
  const [data, setData] = useState<EnvelopesData>({});
  const [editing, setEditing] = useState<EnvelopesData>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/budget/envelopes?month=${monthISO}`, { cache: "no-store", credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      setData(d.envelopes || {});
      setEditing(d.envelopes || {});
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [monthISO]);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      if (!(t.date || "").startsWith(monthISO)) continue;
      const key = (t.category || "uncategorized").toLowerCase();
      map.set(key, (map.get(key) || 0) + t.amount);
    }
    return map;
  }, [txs, monthISO]);

  const rows = useMemo(() => {
    const keys = Object.keys(data);
    keys.sort();
    return keys.map((k) => {
      const budget = Number(data[k] || 0);
      const spent = Number(spentByCategory.get(k.toLowerCase()) || 0);
      const pct = budget > 0 ? Math.min(1, spent / budget) : 0;
      return { name: k, budget, spent, pct };
    });
  }, [data, spentByCategory]);

  const save = async () => {
    await fetch("/api/budget/envelopes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ month: monthISO, envelopes: editing }) });
    setData(editing);
  };

  const addRow = () => {
    const name = prompt("Category name (match your transaction categories)") || "";
    if (!name.trim()) return;
    setEditing((e) => ({ ...e, [name.trim()]: e[name.trim()] || 0 }));
  };

  if (loading) return <div className="h-20 rounded-md border card" />;

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <div className="text-xs text-[var(--muted)]">No envelopes yet. Add categories and set amounts.</div>
      ) : rows.map((r) => (
        <div key={r.name} className="rounded-md border card p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium capitalize">{r.name}</div>
            <div className="text-xs">₱{r.spent.toLocaleString()} / ₱{r.budget.toLocaleString()}</div>
          </div>
          <div className="mt-2"><ProgressBar value={r.spent} max={Math.max(1, r.budget)} /></div>
          {r.budget > 0 && r.spent > r.budget && (
            <div className="text-[10px] text-[var(--negative)] mt-1">Overspent by ₱{(r.spent - r.budget).toLocaleString()}</div>
          )}
          <div className="mt-2">
            <input className="border rounded-md px-3 py-1 text-sm w-full" type="number" inputMode="decimal" step="0.01" value={editing[r.name] ?? r.budget} onChange={(e)=> setEditing((prev)=> ({ ...prev, [r.name]: Number(e.target.value || 0) }))} />
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={addRow}>Add Category</Button>
        <Button onClick={save}>Save Envelopes</Button>
      </div>
    </div>
  );
}


