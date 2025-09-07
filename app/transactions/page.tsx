"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";
import { Chip } from "@/components/ui/Chip";
import { ListCard } from "@/components/ui/ListCard";
import { InlineBar } from "@/components/ui/InlineBar";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { SelectGroup } from "@/components/ui/SearchableSelect";
import { incomeCategories, expenseCategories } from "@/components/constants";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { FilterSheet } from "@/components/ui/FilterSheet";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  createdAt?: string;
  classification?: string;
  accountId?: string;
  subcategory?: string;
  recurring?: boolean;
};

type FormState = { type: "income" | "expense"; amount: string; category: string; subcategory?: string; date: string; classification: string; description?: string; accountId: string; recurring?: boolean };

export default function TransactionsPage() {
  const { push } = useToast();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ type: "expense", amount: "", category: expenseCategories[0].name, subcategory: "", date: new Date().toISOString().slice(0,10), classification: "", description: "", accountId: "", recurring: false });
  const [recurringFreq, setRecurringFreq] = useState<""|"daily"|"weekly"|"monthly"|"weekday"|"15th">("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<(FormState & { id: string }) | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string; provider?: string; balance?: number }[]>([]);
  const amountRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const longPressRef = useRef<number | null>(null);
  const [swipe, setSwipe] = useState<{ id: string; open: boolean; dx: number } | null>(null);

  const fetchTxs = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", { cache: "no-store", credentials: "include" });
    if (res.ok) setTxs(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTxs(); loadAccounts(); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bmt:lastUsedTxn");
      if (raw) {
        const last = JSON.parse(raw) as Partial<FormState>;
        setForm((f) => ({
          ...f,
          type: (last.type as "income"|"expense") || f.type,
          category: last.category || f.category,
          subcategory: last.subcategory || "",
          accountId: last.accountId || "",
          recurring: !!last.recurring,
          amount: "",
          date: new Date().toISOString().slice(0,10),
        }));
      }
    } catch {}
    // autofocus amount on mount for speed
    setTimeout(() => amountRef.current?.focus(), 0);
  }, []);

  // Ensure category always matches current type's available categories
  useEffect(() => {
    const valid = (form.type === "income" ? incomeCategories : expenseCategories).map((c) => c.name);
    if (!valid.includes(form.category)) {
      setForm((f) => ({ ...f, category: valid[0], subcategory: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type]);

  const loadAccounts = async () => {
    const res = await fetch("/api/accounts", { cache: "no-store", credentials: "include" });
    if (res.ok) setAccounts(await res.json());
  };

  const addTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    const optimistic = { id: "optimistic" as any, type: payload.type as any, amount: Number(payload.amount), category: payload.category, date: payload.date } as any;
    setTxs((prev)=> [optimistic, ...prev]);
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });
      if (res.ok) {
        // remember last used fields for speed next time
        try { localStorage.setItem("bmt:lastUsedTxn", JSON.stringify({ type: form.type, category: form.category, subcategory: form.subcategory, accountId: form.accountId, recurring: form.recurring })); } catch {}
        // optionally create a recurring template
        if (form.recurring && recurringFreq) {
          const tpl = { id: `tpl-${Date.now()}`, type: form.type, amount: Number(form.amount || 0), category: form.category, subcategory: form.subcategory || undefined, accountId: form.accountId || undefined, frequency: recurringFreq };
          await fetch("/api/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(tpl) });
        }
        // reset only amount, description and date; keep user context
        setForm((f) => ({ ...f, amount: "", description: "", date: new Date().toISOString().slice(0,10) }));
        push({ title: "Transaction added", type: "success" });
        fetchTxs();
        amountRef.current?.focus();
      } else {
        push({ title: "Failed to add", type: "error" });
        setTxs((prev)=> prev.filter(t=> t.id !== "optimistic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const delTx = async (id: string) => {
    const snapshot = txs;
    setTxs((prev)=> prev.filter(t=> t.id !== id));
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { push({ title: "Deleted", type: "success" }); fetchTxs(); } else { push({ title: "Delete failed", type: "error" }); setTxs(snapshot); }
  };

  const duplicateTx = async (t: Tx) => {
    const payload = duplicatePayloadFrom(t);
    const optimistic = { id: `dup-${Date.now()}` as any, type: payload.type as any, amount: Number(payload.amount), category: payload.category, date: payload.date } as any;
    setTxs((prev)=> [optimistic, ...prev]);
    const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });
    if (res.ok) { push({ title: "Duplicated", type: "success" }); fetchTxs(); }
    else { push({ title: "Duplicate failed", type: "error" }); setTxs((prev)=> prev.filter(x=> x.id !== optimistic.id)); }
  };

  const openEdit = (t: Tx) => {
    setEditForm({ id: t.id, type: t.type, amount: String(t.amount), category: t.category, subcategory: t.subcategory || "", date: t.date, classification: t.classification || "", accountId: t.accountId || "", recurring: !!t.recurring });
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    const res = await fetch("/api/transactions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editForm, amount: Number(editForm.amount) }), credentials: "include" });
    if (res.ok) { push({ title: "Saved", type: "success" }); setEditOpen(false); setEditForm(null); fetchTxs(); } else { push({ title: "Save failed", type: "error" }); }
  };

  const openNativePicker = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget as HTMLInputElement;
    // Some browsers require explicit call to open the date picker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as unknown as { showPicker?: () => void }).showPicker?.();
  };

  const isValid = useMemo(() => Number(form.amount) > 0 && !!form.category, [form.amount, form.category]);
  const quickAmounts = [100, 500, 1000, 5000];
  const recentCategories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const t of txs) {
      if (t.type !== form.type) continue;
      if (!seen.has(t.category)) { seen.add(t.category); ordered.push(t.category); }
      if (ordered.length >= 5) break;
    }
    return ordered;
  }, [txs, form.type]);

  const smartCategories = useMemo(() => {
    const now = new Date();
    const dow = now.getDay(); // 0-6
    const slot = (h: number) => h < 11 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "late";
    const score = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== form.type) continue;
      const d = new Date(t.createdAt || `${t.date}T12:00:00`);
      let s = 1;
      if (d.getDay() === dow) s += 1; // same day-of-week
      if (slot(d.getHours()) === slot(now.getHours())) s += 0.5; // same time slot
      score.set(t.category, (score.get(t.category) || 0) + s);
    }
    return [...score.entries()].sort((a,b)=> b[1]-a[1]).slice(0,5).map(([c])=> c);
  }, [txs, form.type]);

  const buildCategoryGroups = useMemo(() => {
    const toOptions = (names: string[]) => names
      .filter((n) => (form.type === "income" ? incomeCategories : expenseCategories).some((c) => c.name === n))
      .map((n) => ({ value: n, label: n }));

    const incomeGroups: Array<{ label: string; cats: string[] }> = [
      { label: "Recent", cats: recentCategories },
      { label: "Employment", cats: ["Salary", "Allowance"] },
      { label: "Self-Employed", cats: ["Freelance & Contract", "Business"] },
      { label: "Passive", cats: ["Investments", "Rental Income", "Cashback & Rewards"] },
      { label: "Other", cats: ["Refunds & Reimbursements", "Stipend & Scholarship", "Gifts", "Other"] },
    ];

    const expenseGroups: Array<{ label: string; cats: string[] }> = [
      { label: "Essentials", cats: ["Food & Dining", "Housing", "Bills & Utilities", "Transportation"] },
      { label: "Lifestyle", cats: ["Shopping", "Entertainment", "Subscriptions", "Personal Care"] },
      { label: "Finance", cats: ["Loans & Debt", "Insurance", "Fees & Charges", "Government & Taxes"] },
      { label: "Family & Education", cats: ["Education", "Kids & Family", "Pets"] },
      { label: "Other", cats: ["Donations & Gifts", "Other"] },
    ];

    const source = form.type === "income" ? incomeGroups : expenseGroups;
    const groups: SelectGroup[] = source
      .filter((g) => g.cats.length > 0)
      .map((g) => ({ label: g.label, options: toOptions(g.cats) }))
      .filter((g) => g.options.length > 0);
    return groups;
  }, [form.type, recentCategories]);

  return (
    <PullToRefresh onRefresh={fetchTxs}>
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Transactions</h1>
          <FilterSheet id="tx" onApply={()=> fetchTxs()}>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Segmented value={form.type} onChange={(v)=> setForm((f)=> ({ ...f, type: v as any }))} options={["income","expense"]} /></div>
              <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Search" onChange={(e)=> {/* handled by page search in future */}} />
            </div>
          </FilterSheet>
        </div>
        <Card className="card">
          <div className="px-3 pt-3">
            <div className="text-xs text-[var(--muted)]">Quick Add</div>
          </div>
          <CardContent className="grid grid-cols-2 gap-2">
            <form onSubmit={addTx} className="contents">
              <div className="col-span-2"><Segmented value={form.type} onChange={(v)=>{
                const nextType = v as "income" | "expense";
                const firstCategory = (nextType === "income" ? incomeCategories : expenseCategories)[0].name;
                setForm({ ...form, type: nextType, category: firstCategory, subcategory: "" });
              }} options={["income","expense"]} /></div>
              <div className="col-span-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">₱</span>
                <input aria-label="Amount" ref={amountRef} className="border rounded-md pl-7 pr-3 py-2 text-2xl font-semibold w-full" inputMode="decimal" step="0.01" min="0" type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="col-span-2 flex gap-2 overflow-x-auto py-1">
                {quickAmounts.map((q) => (
                  <button key={q} type="button" className="text-xs border rounded-full px-3 py-1 hover:bg-white/5" onClick={() => setForm({ ...form, amount: String(Number(form.amount || 0) + q) })}>+{q.toLocaleString()}</button>
                ))}
              </div>
              <SearchableSelect
                className="col-span-2"
                groups={buildCategoryGroups}
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                placeholder="Category"
              />
              {recentCategories.length > 0 && (
                <div className="col-span-2 space-y-1">
                  {smartCategories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {smartCategories.map((c) => (
                        <button key={`smart-${c}`} type="button" className="text-[10px] border rounded-full px-2.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setForm({ ...form, category: c })}>{c}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 overflow-x-auto">
                    {recentCategories.map((c) => (
                      <button key={`recent-${c}`} type="button" className="text-[10px] border rounded-full px-2.5 py-1 text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setForm({ ...form, category: c })}>{c}</button>
                    ))}
                  </div>
                </div>
              )}
              <SearchableSelect
                className="col-span-2"
                options={(() => {
                  const pool = (form.type === "income" ? incomeCategories : expenseCategories);
                  const entry = pool.find((c) => c.name === form.category) || pool.find((c) => (c.subs || []).includes(form.category));
                  const subs = entry?.subs || [];
                  return subs.map((s) => ({ value: s, label: s }));
                })()}
                value={form.subcategory || ""}
                onChange={(v) => setForm({ ...form, subcategory: v })}
                placeholder="Subcategory"
              />
              <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Classification (e.g., Recurring, Fixed, Variable)" value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
              <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Notes (optional)" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <SearchableSelect
                className="col-span-2"
                options={[{ value: "", label: "No Account" }, ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.provider ? " • " + a.provider : ""}` }))]}
                value={form.accountId}
                onChange={(v) => setForm({ ...form, accountId: v })}
                placeholder="Select Account (optional)"
              />
              <label className="text-xs flex items-center gap-2 col-span-2"><input type="checkbox" checked={!!form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> Recurring</label>
              {form.recurring && (
                <select className="border rounded-md px-3 py-2 col-span-2" value={recurringFreq} onChange={(e)=> setRecurringFreq(e.target.value as any)}>
                  <option value="">Frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekday">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="15th">Mid-month (15th)</option>
                </select>
              )}
              <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} onFocus={openNativePicker} onClick={openNativePicker} />
              {!isValid && <div className="col-span-2 text-[10px] text-[var(--negative)]">Enter a valid amount and pick a category.</div>}
              <Button type="submit" fullWidth className="col-span-2" disabled={!isValid || submitting} aria-busy={submitting}>{submitting ? "Saving..." : "Quick Add"}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-2">
        {loading ? (
          <ListSkeleton />
        ) : txs.length === 0 ? (
          <div className="rounded-md border card p-4 text-sm">
            <div className="font-medium mb-1">No transactions yet</div>
            <div className="text-[var(--muted)] mb-2">Use Quick Add above to record income or expenses. You can set recurring rules on the Recurring page.</div>
            <div className="flex gap-2"><Button variant="secondary" href="/recurring">Set recurring →</Button><Button variant="secondary" href="/accounts">Add an account →</Button></div>
          </div>
        ) : (
          txs.map((t) => (
            <div
              key={t.id}
              onPointerDown={() => { if (longPressRef.current) window.clearTimeout(longPressRef.current); longPressRef.current = window.setTimeout(() => duplicateTx(t), 600) as unknown as number; }}
              onPointerUp={() => { if (longPressRef.current) window.clearTimeout(longPressRef.current); }}
              onPointerLeave={() => { if (longPressRef.current) window.clearTimeout(longPressRef.current); }}
              onContextMenu={(e) => { e.preventDefault(); duplicateTx(t); }}
              onTouchStart={(e)=> { const x = e.touches[0].clientX; setSwipe({ id: t.id, open: swipe?.id===t.id ? swipe.open : false, dx: x }); }}
              onTouchMove={(e)=> { if (!swipe || swipe.id!==t.id) return; const dx = e.touches[0].clientX - (swipe.dx||0); setSwipe({ ...swipe, dx }); }}
              onTouchEnd={()=> { if (!swipe || swipe.id!==t.id) return; const open = (swipe.dx||0) < -60; setSwipe({ id: t.id, open, dx: 0 }); }}
              className="relative"
            >
              {/* action row */}
              <div className="absolute inset-0 flex items-center justify-end gap-2 pr-3" style={{ zIndex: 0 }}>
                <Button variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
                <Button variant="danger" onClick={() => { if (t.id !== "optimistic" && confirm("Delete this transaction?")) delTx(t.id); }}>Delete</Button>
                <Button variant="secondary" onClick={() => duplicateTx(t)}>Duplicate</Button>
              </div>
              <div style={{ transform: `translateX(${swipe && swipe.id===t.id ? Math.max(-120, Math.min(0, swipe.open ? -120 : (swipe.dx||0))) : 0}px)`, transition: swipe && swipe.id===t.id && swipe.dx!==0 ? "none" : "transform 150ms ease" }}>
                <ListCard
                  className={t.type === "income" ? "border-l-4 border-l-[var(--positive)]" : "border-l-4 border-l-[var(--negative)]"}
                  left={<div className="flex items-center gap-2"><Chip tone={t.type === "income" ? "pos" : "neg"}>{t.type}</Chip><span>{t.category}</span>{t.accountId && <span className="text-[10px] text-[var(--muted)]">• {accounts.find(a => a.id === t.accountId)?.name || t.accountId}</span>}</div>}
                  sub={<InlineBar value={Math.min(100, t.amount)} max={100} color={t.type === "income" ? "#22c55e" : "#ef4444"} />}
                  right={<div className="flex items-center gap-2"><div className={t.type === "income" ? "text-[var(--positive)]" : "text-[var(--negative)]"}>₱{t.amount.toLocaleString()}</div></div>}
                />
              </div>
            </div>
          ))
        )}
        </div>
      </main>
      
      <BottomNav items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/transactions", label: "Transactions", active: true },
        { href: "/history", label: "History" },
        { href: "/accounts", label: "Accounts" },
      ]} />
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Transaction">
        {editForm && (
          <form onSubmit={saveEdit} className="grid grid-cols-2 gap-2">
            <select className="border rounded-md px-3 py-2" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input className="border rounded-md px-3 py-2" type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
            <SearchableSelect className="col-span-2" options={(editForm.type === "income" ? incomeCategories : expenseCategories).map((c) => ({ value: c.name, label: c.name }))} value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })} />
            <SearchableSelect className="col-span-2" options={(() => { const pool = (editForm.type === "income" ? incomeCategories : expenseCategories); const entry = pool.find((c) => c.name === editForm.category); const subs = entry?.subs || []; return subs.map((s) => ({ value: s, label: s })); })()} value={editForm.subcategory || ""} onChange={(v) => setEditForm({ ...editForm, subcategory: v })} placeholder="Subcategory" />
            <input className="border rounded-md px-3 py-2 col-span-2" value={editForm.classification} onChange={(e) => setEditForm({ ...editForm, classification: e.target.value })} placeholder="Classification" />
            <SearchableSelect className="col-span-2" options={[{ value: "", label: "No Account" }, ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.provider ? " • " + a.provider : ""}` }))]} value={editForm.accountId} onChange={(v) => setEditForm({ ...editForm, accountId: v })} />
            <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} onFocus={openNativePicker} onClick={openNativePicker} />
            <div className="col-span-2 flex gap-2">
              <Button type="submit" className="flex-1" fullWidth>Save</Button>
              <Button type="button" variant="danger" className="flex-1" fullWidth onClick={() => { if (confirm("Delete this transaction?")) { setEditOpen(false); delTx(editForm.id); } }}>Delete</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
    </PullToRefresh>
  );
}

// helpers
function duplicatePayloadFrom(t: Tx) {
  return {
    type: t.type,
    amount: t.amount,
    category: t.category,
    subcategory: t.subcategory,
    date: new Date().toISOString().slice(0,10),
    classification: t.classification,
    accountId: t.accountId,
    recurring: t.recurring,
  } as const;
}


