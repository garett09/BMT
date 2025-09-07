"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/ui/TopBar";

export default function SettingsPage() {
  const [exportData, setExportData] = useState<any | null>(null);

  const doExport = async () => {
    const res = await fetch("/api/data/export", { cache: "no-store" });
    if (res.ok) setExportData(await res.json());
  };

  const doImport = async () => {
    if (!exportData) return;
    await fetch("/api/data/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exportData) });
    alert("Imported sample data");
  };

  useEffect(() => {}, []);

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Data Export / Import</div>
          <div className="flex gap-2">
            <button onClick={doExport} className="rounded-md bg-black text-white px-3 py-2 text-sm">Export</button>
            <button onClick={doImport} className="rounded-md border px-3 py-2 text-sm">Import last export</button>
          </div>
          {exportData && (
            <pre className="text-xs overflow-auto max-h-48 bg-black/5 p-2 rounded">{JSON.stringify(exportData, null, 2)}</pre>
          )}
        </div>
      </main>
      <nav className="sticky bottom-0 border-t bg-background">
        <div className="grid grid-cols-3 max-w-md mx-auto">
          <a href="/dashboard" className="p-3 text-center text-sm">Dashboard</a>
          <a href="/transactions" className="p-3 text-center text-sm">Transactions</a>
          <a href="/settings" className="p-3 text-center text-sm">Settings</a>
        </div>
      </nav>
    </div>
  );
}


