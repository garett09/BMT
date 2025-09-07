"use client";
import { Button } from "@/components/ui/Button";

export function Nudges({ totalExpense, targetBudget, netWorth }: { totalExpense: number; targetBudget: number; netWorth: number }) {
  const cards = [] as Array<{ title: string; desc: string; action?: { label: string; onClick: () => void } }>;

  if (targetBudget > 0 && totalExpense > targetBudget * 0.8 && totalExpense <= targetBudget) {
    cards.push({ title: "Risk of overspend", desc: "You're above 80% of budget. Consider tightening this week.", action: { label: "Lower envelopes 5%", onClick: async () => { await fetch("/api/budget/envelopes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ month: new Date().toISOString().slice(0,7), envelopes: {} }) }); } } });
  }
  if (netWorth < 0) {
    cards.push({ title: "Low net worth", desc: "Your liabilities exceed assets. Plan a small weekly surplus.", action: { label: "Set goal", onClick: () => { window.location.href = "/dashboard"; } } });
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-md border card p-3">
          <div className="text-sm font-medium">{c.title}</div>
          <div className="text-xs text-[var(--muted)] mt-1">{c.desc}</div>
          {c.action && <Button className="mt-2" variant="secondary" onClick={c.action.onClick}>{c.action.label}</Button>}
        </div>
      ))}
    </div>
  );
}


