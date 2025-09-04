"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BottomNav } from "@/components/ui/BottomNav";
import { Chip } from "@/components/ui/Chip";
import { ListCard } from "@/components/ui/ListCard";
import { InlineBar } from "@/components/ui/InlineBar";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { incomeCategories, expenseCategories } from "@/components/constants";
import { Modal } from "@/components/ui/Modal";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  classification?: string;
  accountId?: string;
  subcategory?: string;
  recurring?: boolean;
};

type FormState = { type: "income" | "expense"; amount: string; category: string; subcategory?: string; date: string; classification: string; accountId: string; recurring?: boolean };

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ type: "expense", amount: "", category: "General", subcategory: "", date: new Date().toISOString().slice(0,10), classification: "", accountId: "", recurring: false });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<(FormState & { id: string }) | null>(null);
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ id: string; name: string; provider?: string }[]>([]);
  const [filterAccount, setFilterAccount] = useState<string>("");

  const fetchTxs = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", { cache: "no-store" });
    if (res.ok) setTxs(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTxs(); loadAccounts(); }, []);

  const loadAccounts = async () => {
    const res = await fetch("/api/accounts", { cache: "no-store" });
    if (res.ok) setAccounts(await res.json());
  };

  const addTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });
    if (res.ok) {
      setForm({ type: "expense", amount: "", category: "General", subcategory: "", date: new Date().toISOString().slice(0,10), classification: "", accountId: "", recurring: false });
      fetchTxs();
    }
  };

  const delTx = async (id: string) => {
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) fetchTxs();
  };

  const openEdit = (t: Tx) => {
    setEditForm({ id: t.id, type: t.type, amount: String(t.amount), category: t.category, subcategory: t.subcategory || "", date: t.date, classification: t.classification || "", accountId: t.accountId || "", recurring: !!t.recurring });
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    const res = await fetch("/api/transactions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editForm, amount: Number(editForm.amount) }) });
    if (res.ok) { setEditOpen(false); setEditForm(null); fetchTxs(); }
  };

  const openNativePicker = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget as HTMLInputElement;
    // Some browsers require explicit call to open the date picker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as any).showPicker?.();
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <div className="grid grid-cols-2 gap-2">
          <SearchableSelect
            className="col-span-2"
            options={[{ value: "", label: "All Accounts" }, ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.provider ? " • " + a.provider : ""}` }))]}
            value={filterAccount}
            onChange={(v) => setFilterAccount(v)}
            placeholder="Filter by account"
          />
        </div>

        <form onSubmit={addTx} className="grid grid-cols-2 gap-2">
        <select className="border rounded-md px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input className="border rounded-md px-3 py-2" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <SearchableSelect
          className="col-span-2"
          options={(form.type === "income" ? incomeCategories : expenseCategories).map((c) => ({ value: c.name, label: c.name }))}
          value={form.category}
          onChange={(v) => setForm({ ...form, category: v })}
          placeholder="Category"
        />
        <SearchableSelect
          className="col-span-2"
          options={(() => {
            const pool = (form.type === "income" ? incomeCategories : expenseCategories);
            const entry = pool.find((c) => c.name === form.category);
            const subs = entry?.subs || [];
            return subs.map((s) => ({ value: s, label: s }));
          })()}
          value={form.subcategory || ""}
          onChange={(v) => setForm({ ...form, subcategory: v })}
          placeholder="Subcategory"
        />
        <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Classification (e.g., Recurring, Fixed, Variable)" value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} />
        <SearchableSelect
          className="col-span-2"
          options={[{ value: "", label: "No Account" }, ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.provider ? " • " + a.provider : ""}` }))]}
          value={form.accountId}
          onChange={(v) => setForm({ ...form, accountId: v })}
          placeholder="Select Account (optional)"
        />
        <label className="text-xs flex items-center gap-2 col-span-2"><input type="checkbox" checked={!!form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> Recurring</label>
        <input className="border rounded-md px-3 py-2 col-span-2" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} onFocus={openNativePicker} onClick={openNativePicker} />
        <Button type="submit" fullWidth className="col-span-2">Add</Button>
        </form>

        <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          txs
          .filter((t) => !filterAccount || t.accountId === filterAccount)
          .map((t) => (
            <ListCard
              key={t.id}
              left={<div className="flex items-center gap-2"><Chip tone={t.type === "income" ? "pos" : "neg"}>{t.type}</Chip><span>{t.category}</span>{t.accountId && <span className="text-[10px] text-[var(--muted)]">• {accounts.find(a => a.id === t.accountId)?.name || t.accountId}</span>}</div>}
              sub={<InlineBar value={Math.min(100, t.amount)} max={100} color={t.type === "income" ? "#22c55e" : "#ef4444"} />}
              right={<div className="flex items-center gap-2"><div className={t.type === "income" ? "text-[var(--positive)]" : "text-[var(--negative)]"}>₱{t.amount.toLocaleString()}</div><Button variant="secondary" onClick={() => openEdit(t)}>Edit</Button></div>}
            />
          ))
        )}
        </div>
      </main>
      <BottomNav items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/transactions", label: "Transactions", active: true },
        { href: "/notifications", label: "Inbox" },
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
            <Button type="submit" className="col-span-2" fullWidth>Save</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}


