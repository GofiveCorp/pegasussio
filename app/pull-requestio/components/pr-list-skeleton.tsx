import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PRListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-full max-w-[70%]">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2 mt-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
