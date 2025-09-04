import Link from "next/link";
import { LogOut, User } from "lucide-react";

export function HeaderBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 border-b">
      <div className="max-w-md mx-auto flex items-center justify-between p-3">
        <div className="text-lg font-semibold brand-text">{title}</div>
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <Link href="/settings" aria-label="Settings"><User size={18} /></Link>
          <form action="/api/auth/signout" method="post">
            <button className="hover:text-[var(--foreground)]" aria-label="Logout"><LogOut size={18} /></button>
          </form>
        </div>
      </div>
    </header>
  );
}


