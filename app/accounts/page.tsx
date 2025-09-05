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
import { Chip } from "@/components/ui/Chip";

type Account = { id: string; name: string; type: "cash" | "bank" | "credit" | "other"; balance: number; provider?: string; subtype?: "debit" | "savings" | "checking" | "ewallet" | "credit" | "other" };

export default function AccountsPage() {
  const { push } = useToast();
  const [list, setList] = useState<Account[]>([]);
  const [form, setForm] = useState<Account>({ id: "", name: "", type: "cash", balance: 0, provider: "", subtype: "savings" });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"all" | "cash" | "bank" | "credit" | "other">("all");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/accounts", { cache: "no-store", credentials: "include" });
    if (res.ok) setList(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalBalance = list.reduce((s, a) => s + Number(a.balance || 0), 0);
  const filtered = list.filter((a) => (filter === "all" ? true : a.type === filter));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = {
      id: form.id || String(Date.now()),
      name: String(form.name || "").trim(),
      type: form.type,
      balance: Number(form.balance || 0),
      provider: form.provider?.trim() ? form.provider : undefined,
    } as Partial<Account> & { id: string; name: string; type: Account["type"]; balance: number };
    const payload: any = { ...base };
    if (form.type !== "cash") {
      payload.subtype = form.subtype || (form.type === "credit" ? "credit" : "savings");
    }
    const res = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });
    if (res.ok) {
      setForm({ id: "", name: "", type: "cash", balance: 0, provider: "" });
      setOpen(false);
      push({ title: "Account saved", type: "success" });
      load();
    } else {
      const msg = await res.text().catch(() => "");
      push({ title: `Save failed${msg ? ": "+msg : ""}`, type: "error" });
    }
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

        <div className="space-y-2">
          <Button fullWidth onClick={() => { setForm({ id: "", name: "", type: "cash", balance: 0, provider: "", subtype: "savings" }); setOpen(true); setTimeout(()=>nameRef.current?.focus(), 0); }}>Add Account</Button>
          <Segmented value={filter} onChange={(v)=> setFilter(v as any)} options={["all","cash","bank","credit","other"]} />
        </div>

        <div className="rounded-md border card p-3 grid grid-cols-3 gap-2 items-center">
          <div className="col-span-2">
            <div className="text-sm text-[var(--muted)]">Total Balance</div>
            <div className="text-xl font-semibold">₱{totalBalance.toLocaleString()}</div>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            {list.length} accounts
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <ListSkeleton />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          ) : (
            filtered.map((a) => {
              const low = Number(a.balance) <= 500;
              return (
                <ListCard
                  key={a.id}
                  className={low ? "border-l-4 border-l-[var(--negative)]" : undefined}
                  left={<div className="flex items-center gap-2"><span className="font-medium">{a.name}</span>{(a.subtype||a.type) && <Chip>{a.subtype || a.type}</Chip>}{a.provider && <Chip>{a.provider}</Chip>}{low && <Chip tone="neg">Low</Chip>}</div>}
                  sub={<div className="text-xs text-[var(--muted)]">₱{a.balance.toLocaleString()}</div>}
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
              <div className="col-span-2"><Segmented value={form.type} onChange={(v)=>{
                const nextType = v as "cash" | "bank" | "credit" | "other";
                const defaults: Record<"cash"|"bank"|"credit"|"other", Account["subtype"]> = {
                  cash: undefined,
                  bank: "savings",
                  credit: "credit",
                  other: "ewallet",
                };
                setForm((f)=> ({
                  ...f,
                  type: nextType,
                  subtype: defaults[nextType],
                  provider: nextType === "cash" ? "" : f.provider,
                }));
              }} options={["cash","bank","credit","other"]} /></div>
              {form.type !== "cash" && (
              <select className="border rounded-md px-3 py-2" value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value as any })}>
                {form.type === "bank" && (<>
                  <option value="savings">Savings</option>
                  <option value="checking">Checking</option>
                  <option value="debit">Debit</option>
                  <option value="other">Other</option>
                </>)}
                {form.type === "credit" && (<option value="credit">Credit</option>)}
                {form.type === "other" && (<>
                  <option value="ewallet">eWallet</option>
                  <option value="other">Other</option>
                </>)}
              </select>
              )}
              {form.type !== "cash" && (
              <SearchableSelect className="col-span-2" options={[{ value: "", label: "No Provider" }, ...providers]} value={form.provider || ""} onChange={(v) => setForm({ ...form, provider: v })} placeholder="Provider (optional)" />
              )}
              <div className="col-span-2 space-y-2">
                <input className="border rounded-md px-3 py-2 w-full" inputMode="decimal" step="0.01" min="0" type="number" placeholder="Starting balance" value={form.balance === 0 ? "" : (form.balance as number)} onChange={(e) => setForm({ ...form, balance: Number(e.target.value || 0) })} />
                <div className="flex gap-2 overflow-x-auto">
                  {[0,500,1000,5000,10000].map((n)=> (
                    <button key={n} type="button" className="text-[10px] border rounded-full px-2.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={()=> setForm((f)=> ({ ...f, balance: n }))}>₱{n.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" fullWidth onClick={()=> setOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" fullWidth disabled={!form.name.trim()}>Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Modal>

      
    </div>
    </PullToRefresh>
  );
}


