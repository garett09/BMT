"use client";
import { useEffect, useRef, useState } from "react";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { ListCard } from "@/components/ui/ListCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { providers } from "@/components/constants";
import { BottomNav } from "@/components/ui/BottomNav";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { useToast } from "@/components/ui/Toast";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { Segmented } from "@/components/ui/Segmented";
import { Card, CardContent } from "@/components/ui/Card";

type Account = { id: string; name: string; type: "cash" | "bank" | "credit" | "other"; balance: number; provider?: string; subtype?: "debit" | "savings" | "checking" | "ewallet" | "credit" | "other" };

export default function AccountsPage() {
  const { push } = useToast();
  const [list, setList] = useState<Account[]>([]);
  const [form, setForm] = useState<Account>({ id: "", name: "", type: "cash", balance: 0, provider: "", subtype: "savings" });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/accounts", { cache: "no-store" });
    if (res.ok) setList(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, id: form.id || String(Date.now()), balance: Number(form.balance) };
    const res = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });
    if (res.ok) { setForm({ id: "", name: "", type: "cash", balance: 0, provider: "" }); setOpen(false); push({ title: "Account saved", type: "success" }); load(); } else { push({ title: "Save failed", type: "error" }); }
  };

  const delItem = async (id: string) => {
    const snapshot = list;
    setList((prev)=> prev.filter(a=> a.id !== id));
    const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { push({ title: "Deleted", type: "success" }); load(); } else { push({ title: "Delete failed", type: "error" }); setList(snapshot); }
  };

  return (
    <PullToRefresh onRefresh={load}>
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <HeroBanner title="Account Management" subtitle="Manage all your financial accounts in one place" />
        <div className="flex justify-end"><Button onClick={() => { setOpen(true); setTimeout(()=>nameRef.current?.focus(), 0); }}>Add Account</Button></div>

        <div className="space-y-2">
          {loading ? (
            <ListSkeleton />
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          ) : (
            list.map((a) => {
              const low = Number(a.balance) <= 500;
              return (
                <ListCard
                  key={a.id}
                  className={low ? "border-l-4 border-l-[var(--negative)]" : undefined}
                  left={<div className="flex items-center gap-2">{a.name} • {a.subtype || a.type}{a.provider ? ` • ${a.provider}` : ""}{low && <span className="text-[10px] text-[var(--negative)]">Low</span>}</div>}
                  sub={`₱${a.balance.toLocaleString()}`}
                  right={<div className="flex gap-2">{low && <Button variant="secondary" onClick={() => { setForm({ ...a }); setOpen(true); }}>Fund</Button>}<Button variant="secondary" onClick={() => { setForm(a); setOpen(true); }}>Edit</Button><Button variant="danger" onClick={() => delItem(a.id)}>Delete</Button></div>}
                />
              );
            })
          )}
        </div>
      </main>
      <BottomNav items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/transactions", label: "Transactions" }, { href: "/history", label: "History" }, { href: "/accounts", label: "Accounts", active: true }]} />

      <Modal open={open} onClose={() => setOpen(false)} title="Add New Account">
        <Card className="card">
          <CardContent>
            <form onSubmit={save} className="grid grid-cols-2 gap-2">
              <input ref={nameRef} className="border rounded-md px-3 py-2 col-span-2" placeholder="Account name (e.g., BPI Salary)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="col-span-2"><Segmented value={form.type} onChange={(v)=>setForm({ ...form, type: v as any })} options={["cash","bank","credit","other"]} /></div>
              <select className="border rounded-md px-3 py-2" value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value as any })}>
                <option value="savings">Savings</option>
                <option value="checking">Checking</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
                <option value="ewallet">eWallet</option>
                <option value="other">Other</option>
              </select>
              <SearchableSelect className="col-span-2" options={[{ value: "", label: "No Provider" }, ...providers]} value={form.provider || ""} onChange={(v) => setForm({ ...form, provider: v })} placeholder="Provider (optional)" />
              <input className="border rounded-md px-3 py-2" type="number" placeholder="Starting balance" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} />
              <Button type="submit" className="col-span-2" fullWidth>Save</Button>
            </form>
          </CardContent>
        </Card>
      </Modal>

      
    </div>
    </PullToRefresh>
  );
}


