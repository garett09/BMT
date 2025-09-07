"use client";
import { useEffect, useState } from "react";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { ListCard } from "@/components/ui/ListCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InlineBar } from "@/components/ui/InlineBar";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";

type SavingsGoal = { id: string; name: string; targetAmount: number; currentAmount: number; dueDate?: string };

export default function SavingsPage() {
  const [list, setList] = useState<SavingsGoal[]>([]);
  const [form, setForm] = useState<SavingsGoal>({ id: "", name: "", targetAmount: 0, currentAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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
    if (res.ok) { setForm({ id: "", name: "", targetAmount: 0, currentAmount: 0 }); setOpen(false); load(); }
  };

  const delItem = async (id: string) => {
    const res = await fetch(`/api/savings?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <HeroBanner title="Savings Goals" subtitle="Track and achieve your savings targets" color="#06b6d4" />
        <div className="flex justify-end"><Button onClick={() => setOpen(true)}>Add Goal</Button></div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet.</p>
          ) : (
            list.map((g) => (
              <ListCard key={g.id} left={g.name} sub={<InlineBar value={g.currentAmount} max={g.targetAmount || 1} color="#06b6d4" />} right={<Button variant="secondary" onClick={() => delItem(g.id)}>Delete</Button>} />
            ))
          )}
        </div>
      </main>
      <BottomNav items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/transactions", label: "Transactions" }, { href: "/savings", label: "Savings", active: true }]} />

      <Modal open={open} onClose={() => setOpen(false)} title="Add Savings Goal">
        <form onSubmit={save} className="grid grid-cols-2 gap-2">
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded-md px-3 py-2" type="number" placeholder="Target" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) })} />
          <input className="border rounded-md px-3 py-2" type="number" placeholder="Current" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: Number(e.target.value) })} />
          <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Button type="submit" className="col-span-2" fullWidth>Save</Button>
        </form>
      </Modal>
    </div>
  );
}


