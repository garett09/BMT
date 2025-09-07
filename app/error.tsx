"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="rounded-md border card p-6 max-w-md text-center space-y-2">
        <div className="text-xl font-semibold">Something went wrong</div>
        <div className="text-sm text-[var(--muted)]">{error.message || "An unexpected error occurred."}</div>
        <div className="flex gap-2 justify-center mt-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" href="/">Go home</Button>
        </div>
      </div>
    </div>
  );
}
