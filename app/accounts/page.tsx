"use client";
import { useEffect, useState } from "react";
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

type Account = { id: string; name: string; type: "cash" | "bank" | "credit" | "other"; balance: number; provider?: string; subtype?: "debit" | "savings" | "checking" | "ewallet" | "credit" | "other" };

export default function AccountsPage() {
  const { push } = useToast();
  const [list, setList] = useState<Account[]>([]);
  const [form, setForm] = useState<Account>({ id: "", name: "", type: "cash", balance: 0, provider: "", subtype: "savings" });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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
        <div className="flex justify-end"><Button onClick={() => setOpen(true)}>Add Account</Button></div>

        <div className="space-y-2">
          {loading ? (
            <ListSkeleton />
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          ) : (
            list.map((a) => (
              <ListCard key={a.id} left={`${a.name} • ${a.subtype || a.type}${a.provider ? " • " + a.provider : ""}`} sub={`₱${a.balance.toLocaleString()}`} right={<div className="flex gap-2"><Button variant="secondary" onClick={() => { setForm(a); setOpen(true); }}>Edit</Button><Button variant="danger" onClick={() => delItem(a.id)}>Delete</Button></div>} />
            ))
          )}
        </div>
      </main>
      <BottomNav items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/transactions", label: "Transactions" }, { href: "/accounts", label: "Accounts", active: true }, { href: "/notifications", label: "Inbox" }]} />

      <Modal open={open} onClose={() => setOpen(false)} title="Add New Account">
        <form onSubmit={save} className="grid grid-cols-2 gap-2">
          <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="border rounded-md px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Account["type"] })}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="credit">Credit</option>
            <option value="other">Other</option>
          </select>
          <select className="border rounded-md px-3 py-2" value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value as any })}>
            <option value="savings">Savings</option>
            <option value="checking">Checking</option>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
            <option value="ewallet">eWallet</option>
            <option value="other">Other</option>
          </select>
          <SearchableSelect className="col-span-2" options={[{ value: "", label: "No Provider" }, ...providers]} value={form.provider || ""} onChange={(v) => setForm({ ...form, provider: v })} placeholder="Provider (optional)" />
          <input className="border rounded-md px-3 py-2" type="number" placeholder="Balance" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} />
          <Button type="submit" className="col-span-2" fullWidth>Save</Button>
        </form>
      </Modal>
    </div>
    </PullToRefresh>
  );
}


