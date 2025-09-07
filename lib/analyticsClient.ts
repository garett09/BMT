"use client";

type EventProps = Record<string, unknown> | undefined;

export function trackEvent(eventName: string, props?: EventProps) {
  try {
    // Prefer Vercel Analytics if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const va = (window as any).va;
    if (va && typeof va.track === "function") {
      va.track(eventName, props || {});
      return;
    }
  } catch {}
  try {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] ${eventName}`, props || {});
    }
  } catch {}
}


