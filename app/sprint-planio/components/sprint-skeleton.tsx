import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function SprintSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-8 max-w-7xl mx-auto w-full">
        {/* Board Skeleton */}
        <div className="flex-1 flex flex-col items-center gap-8">
          <Skeleton className="w-full h-24 rounded-xl" />

          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px]">
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-28 w-20 sm:h-32 sm:w-24 rounded-xl" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>

          {/* Hand Skeleton */}
          <div className="w-full max-w-3xl border-t border-zinc-200 dark:border-zinc-800 pt-8">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-24 w-16 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-full lg:w-80 flex flex-col gap-8 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-8 lg:pt-0 lg:pl-8">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <Skeleton className="h-4 w-20 mb-4" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
