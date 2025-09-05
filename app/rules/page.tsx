"use client";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { useToast } from "@/components/ui/Toast";

type Rule = { id: string; when: { sourceRegex?: string }; then: { setCategory?: string; splitToSavingsPercent?: number } };

export default function RulesPage() {
  const { push } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Rule>({ id: "", when: { sourceRegex: "" }, then: { setCategory: "", splitToSavingsPercent: undefined } });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rules", { cache: "no-store", credentials: "include" });
    if (res.ok) setRules(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Rule = {
      id: form.id || String(Date.now()),
      when: { sourceRegex: form.when.sourceRegex || undefined },
      then: {
        setCategory: form.then.setCategory || undefined,
        splitToSavingsPercent: form.then.splitToSavingsPercent ? Number(form.then.splitToSavingsPercent) : undefined,
      },
    };
    const res = await fetch("/api/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });
    if (res.ok) { push({ title: "Rule saved", type: "success" }); setForm({ id: "", when: { sourceRegex: "" }, then: { setCategory: "", splitToSavingsPercent: undefined } }); load(); }
    else push({ title: "Save failed", type: "error" });
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/rules?id=${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { push({ title: "Deleted", type: "success" }); load(); }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Rules</h1>
        <form onSubmit={save} className="grid grid-cols-2 gap-2 rounded-md border card p-3">
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Rule ID (optional)" value={form.id} onChange={(e)=> setForm({ ...form, id: e.target.value })} />
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="When: source regex (e.g., ^Starbucks)" value={form.when.sourceRegex || ""} onChange={(e)=> setForm({ ...form, when: { sourceRegex: e.target.value } })} />
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Then: set category (e.g., Food & Dining)" value={form.then.setCategory || ""} onChange={(e)=> setForm({ ...form, then: { ...form.then, setCategory: e.target.value } })} />
          <input className="border rounded-md px-3 py-2 col-span-2" type="number" inputMode="decimal" placeholder="Then: split to savings % (0-100)" value={form.then.splitToSavingsPercent || ""} onChange={(e)=> setForm({ ...form, then: { ...form.then, splitToSavingsPercent: Number(e.target.value) } })} />
          <Button type="submit" className="col-span-2" fullWidth>Save Rule</Button>
        </form>

        {loading ? (
          <ListSkeleton />
        ) : rules.length === 0 ? (
          <div className="rounded-md border card p-4 text-center text-sm text-[var(--muted)]">No rules yet.</div>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="rounded-md border card p-3">
                <div className="text-sm font-medium">{r.id}</div>
                <div className="text-xs text-[var(--muted)]">When: source matches <span className="font-mono">{r.when.sourceRegex || "(any)"}</span></div>
                <div className="text-xs text-[var(--muted)]">Then: {r.then.setCategory ? `set category to ${r.then.setCategory}` : ""} {r.then.splitToSavingsPercent ? `• split ${r.then.splitToSavingsPercent}% to savings` : ""}</div>
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" onClick={()=> setForm(r)}>Edit</Button>
                  <Button variant="danger" onClick={()=> remove(r.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/transactions", label: "Transactions" },
        { href: "/history", label: "History" },
        { href: "/accounts", label: "Accounts" },
      ]} />
    </div>
  );
}


