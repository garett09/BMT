import { ReactNode } from "react";

export function StatCard({ title, value, icon, tone = "neutral", delta }: { title: string; value: string; icon?: ReactNode; tone?: "neutral" | "pos" | "neg"; delta?: string }) {
  const toneBg = tone === "pos" ? "bg-emerald-600/20" : tone === "neg" ? "bg-red-600/20" : "bg-blue-600/20";
  return (
    <div className="rounded-2xl border card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[var(--muted)]">{title}</div>
          <div className="text-xl font-semibold mt-0.5">{value}</div>
          {delta && <div className="text-[10px] text-[var(--muted)] mt-1">{delta}</div>}
        </div>
        {icon && <div className={`w-8 h-8 rounded-full ${toneBg} flex items-center justify-center`}>{icon}</div>}
      </div>
    </div>
  );
}


