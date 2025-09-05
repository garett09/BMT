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
import { Chip, ProviderBadge } from "@/components/ui/Chip";

type Account = { id: string; name: string; type: "cash" | "bank" | "credit" | "other"; balance: number; provider?: string; subtype?: "debit" | "savings" | "checking" | "ewallet" | "credit" | "other" };
type CreditExtras = { creditLimit?: number; statementDay?: number; dueDay?: number };

export default function AccountsPage() {
  const { push } = useToast();
  const [list, setList] = useState<Account[]>([]);
  const [form, setForm] = useState<Account & CreditExtras>({ id: "", name: "", type: "cash", balance: 0, provider: "", subtype: "savings" });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"all" | "cash" | "bank" | "credit" | "other">("all");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState<{ fromId: string; toId: string; amount: string }>({ fromId: "", toId: "", amount: "" });

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
    if (form.type === "credit") {
      payload.creditLimit = typeof form.creditLimit === "number" ? form.creditLimit : undefined;
      payload.statementDay = typeof form.statementDay === "number" ? form.statementDay : undefined;
      payload.dueDay = typeof form.dueDay === "number" ? form.dueDay : undefined;
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
          <div className="grid grid-cols-2 gap-2">
            <Button fullWidth onClick={() => { setForm({ id: "", name: "", type: "cash", balance: 0, provider: "", subtype: "savings" }); setOpen(true); setTimeout(()=>nameRef.current?.focus(), 0); }}>Add Account</Button>
            <Button variant="secondary" fullWidth onClick={() => { setTransfer({ fromId: list[0]?.id || "", toId: list[1]?.id || "", amount: "" }); setTransferOpen(true); }}>Transfer</Button>
          </div>
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
              const limit = (a as any).creditLimit as number | undefined;
              const util = a.subtype === "credit" && typeof limit === "number" && limit > 0 ? Math.min(100, Math.round((Math.abs(a.balance) / limit) * 100)) : null;
              return (
                <ListCard
                  key={a.id}
                  className={low ? "border-l-4 border-l-[var(--negative)]" : undefined}
                  left={<div className="flex items-center gap-2"><span className="font-medium">{a.name}</span>{(a.subtype||a.type) && <Chip>{a.subtype || a.type}</Chip>}{a.provider && <ProviderBadge name={a.provider} />}{util !== null && <Chip tone={util>50?"neg":"pos"}>{util}%</Chip>}{low && <Chip tone="neg">Low</Chip>}</div>}
                  sub={<div className="text-xs text-[var(--muted)]">₱{a.balance.toLocaleString()}</div>}
                  right={<div className="flex gap-2">{low && <Button variant="secondary" onClick={() => { setForm({ ...a } as any); setOpen(true); }}>Fund</Button>}<Button variant="secondary" onClick={() => { setForm(a as any); setOpen(true); }}>Edit</Button><Button variant="secondary" onClick={() => { setTransfer({ fromId: a.id, toId: list.find(x=>x.id!==a.id)?.id || "", amount: "" }); setTransferOpen(true); }}>Transfer</Button><Button variant="danger" onClick={() => delItem(a.id)}>Delete</Button></div>}
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
              {form.type === "credit" && (
                <>
                  <input className="border rounded-md px-3 py-2" type="number" inputMode="decimal" placeholder="Credit limit" value={form.creditLimit ?? ""} onChange={(e)=> setForm({ ...form, creditLimit: e.target.value ? Number(e.target.value) : undefined })} />
                  <input className="border rounded-md px-3 py-2" type="number" min={1} max={31} placeholder="Statement day (1-31)" value={form.statementDay ?? ""} onChange={(e)=> setForm({ ...form, statementDay: e.target.value ? Number(e.target.value) : undefined })} />
                  <input className="border rounded-md px-3 py-2" type="number" min={1} max={31} placeholder="Due day (1-31)" value={form.dueDay ?? ""} onChange={(e)=> setForm({ ...form, dueDay: e.target.value ? Number(e.target.value) : undefined })} />
                </>
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

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Between Accounts">
        <Card className="card">
          <CardContent>
            <form onSubmit={async (e)=>{ e.preventDefault(); const amt = Number(transfer.amount || 0); if (!transfer.fromId || !transfer.toId || transfer.fromId===transfer.toId || !(amt>0)) { push({ title: "Invalid transfer", type: "error" }); return; } const from = list.find(a=> a.id===transfer.fromId); const to = list.find(a=> a.id===transfer.toId); if (!from || !to) { push({ title: "Invalid accounts", type: "error" }); return; } const updatedFrom: any = { ...from, balance: Number(from.balance) - amt }; const updatedTo: any = { ...to, balance: Number(to.balance) + amt }; const saveOne = async (acc: any) => fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(acc) }); const r1 = await saveOne(updatedFrom); const r2 = await saveOne(updatedTo); if (r1.ok && r2.ok) { push({ title: "Transfer complete", type: "success" }); setTransferOpen(false); load(); } else { push({ title: "Transfer failed", type: "error" }); } }} className="grid grid-cols-2 gap-2">
              <select className="border rounded-md px-3 py-2" value={transfer.fromId} onChange={(e)=> setTransfer({ ...transfer, fromId: e.target.value })}>
                <option value="">From account</option>
                {list.map((a)=> (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
              <select className="border rounded-md px-3 py-2" value={transfer.toId} onChange={(e)=> setTransfer({ ...transfer, toId: e.target.value })}>
                <option value="">To account</option>
                {list.filter(a=> a.id!==transfer.fromId).map((a)=> (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
              <div className="col-span-2 space-y-2">
                <input className="border rounded-md px-3 py-2 w-full" inputMode="decimal" step="0.01" min="0" type="number" placeholder="Amount" value={transfer.amount} onChange={(e)=> setTransfer({ ...transfer, amount: e.target.value })} />
                <div className="flex gap-2 overflow-x-auto">
                  {[500,1000,5000,10000].map((n)=> (
                    <button key={n} type="button" className="text-[10px] border rounded-full px-2.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={()=> setTransfer((t)=> ({ ...t, amount: String(Number(t.amount||0) + n) }))}>+₱{n.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" fullWidth onClick={()=> setTransferOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" fullWidth>Transfer</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Modal>

      
    </div>
    </PullToRefresh>
  );
}


