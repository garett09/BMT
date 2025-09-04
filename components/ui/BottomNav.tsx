import Link from "next/link";
import clsx from "clsx";

export function BottomNav({
  items,
}: {
  items: Array<{ href: string; label: string; active?: boolean }>;
}) {
  return (
    <nav className="sticky bottom-0 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="grid grid-cols-3 max-w-md mx-auto">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={clsx("p-3 text-center text-sm", it.active ? "brand-text" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>{it.label}</Link>
        ))}
      </div>
    </nav>
  );
}


