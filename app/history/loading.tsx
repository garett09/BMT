import { ListSkeleton } from "@/components/ui/ListSkeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        <div className="h-6 w-32 bg-white/10 rounded" />
        <ListSkeleton count={5} />
      </main>
    </div>
  );
}


