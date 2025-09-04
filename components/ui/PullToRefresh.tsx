"use client";
import { useRef, useState } from "react";

export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  return (
    <div
      ref={ref}
      onTouchStart={(e) => setY(e.touches[0].clientY)}
      onTouchEnd={async (e) => {
        const dy = (e.changedTouches?.[0]?.clientY ?? 0) - y;
        if (dy > 80 && !refreshing) {
          setRefreshing(true);
          await onRefresh();
          setRefreshing(false);
        }
      }}
      className="min-h-dvh"
    >
      {refreshing && <div className="text-center text-xs text-[var(--muted)] py-1">Refreshing…</div>}
      {children}
    </div>
  );
}


