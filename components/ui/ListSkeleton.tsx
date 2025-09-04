import { Skeleton } from "@/components/ui/Skeleton";

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-xl card p-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-2 w-full mt-2" />
        </div>
      ))}
    </div>
  );
}


