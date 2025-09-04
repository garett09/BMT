"use client";
import { useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { providers } from "@/components/constants";
import { Button } from "@/components/ui/Button";

export function QuickAddAccount({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [subtype, setSubtype] = useState("savings");
  const [provider, setProvider] = useState("");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: String(Date.now()), name: name || provider || subtype, type: provider ? "bank" : subtype === "ewallet" ? "other" : "other", subtype, provider, balance: Number(balance) }) });
    setLoading(false);
    setName(""); setProvider(""); setBalance("0"); setSubtype("savings");
    onAdded();
  };
  return (
    <form onSubmit={save} className="grid grid-cols-2 gap-2">
      <input className="border rounded-md px-3 py-2 col-span-2" placeholder="Account name" value={name} onChange={(e)=>setName(e.target.value)} />
      <select className="border rounded-md px-3 py-2" value={subtype} onChange={(e)=>setSubtype(e.target.value)}>
        <option value="savings">Savings</option>
        <option value="checking">Checking</option>
        <option value="debit">Debit</option>
        <option value="credit">Credit</option>
        <option value="ewallet">eWallet</option>
        <option value="other">Other</option>
      </select>
      <SearchableSelect className="col-span-2" options={[{ value: "", label: "No Provider" }, ...providers]} value={provider} onChange={setProvider} placeholder="Provider (optional)" />
      <input className="border rounded-md px-3 py-2" type="number" value={balance} onChange={(e)=>setBalance(e.target.value)} placeholder="Balance" />
      <Button className="col-span-2" fullWidth disabled={loading}>{loading?"Saving...":"Add Account"}</Button>
    </form>
  );
}


