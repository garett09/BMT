import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="rounded-md border card p-6 max-w-md text-center space-y-2">
        <div className="text-xl font-semibold">Page not found</div>
        <div className="text-sm text-[var(--muted)]">The page you're looking for doesn't exist.</div>
        <div className="flex gap-2 justify-center mt-2">
          <Button href="/">Go to dashboard</Button>
        </div>
      </div>
    </div>
  );
}
