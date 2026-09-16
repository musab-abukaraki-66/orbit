import { Skeleton } from "@/components/ui/skeleton"

export default function WorkspaceLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-72 w-64 shrink-0" />
        <Skeleton className="h-72 w-64 shrink-0" />
        <Skeleton className="h-72 w-64 shrink-0" />
        <Skeleton className="h-72 w-64 shrink-0" />
      </div>
    </div>
  )
}
