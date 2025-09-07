import Link from "next/link";
import clsx from "clsx";
import { BarChart2, CreditCard, Home, Bell, History } from "lucide-react";

export function BottomNav({
  items,
}: {
  items: Array<{ href: string; label: string; active?: boolean }>;
}) {
  return (
    <nav className="sticky bottom-0 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="max-w-md mx-auto flex justify-around">
        {items.map((it) => {
          const icon = it.label === "Dashboard" ? <Home size={16} /> : it.label === "Transactions" ? <BarChart2 size={16} /> : it.label === "Accounts" ? <CreditCard size={16} /> : it.label === "History" ? <History size={16} /> : <Bell size={16} />;
          return (
            <Link key={it.href} href={it.href} className={clsx("p-3 text-center text-xs flex-1 flex flex-col items-center gap-1", it.active ? "brand-text" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
              {icon}
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


