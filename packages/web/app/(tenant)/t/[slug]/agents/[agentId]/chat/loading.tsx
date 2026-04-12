import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-[280px] bg-zinc-900/50 border-r border-border flex-col p-3 gap-2">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="mt-2 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <div className="h-14 border-b border-border px-6 flex items-center gap-3">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Messages skeleton */}
        <div className="flex-1 px-6 py-6">
          <div className="max-w-[720px] mx-auto flex flex-col gap-4">
            <div className="flex justify-end">
              <Skeleton className="h-12 w-64 rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-20 w-96 rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Input skeleton */}
        <div className="border-t border-border p-4">
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
