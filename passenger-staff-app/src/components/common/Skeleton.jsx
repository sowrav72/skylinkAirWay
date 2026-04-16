export function SkeletonCard() {
  return (
    <div className="card-navy p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-6 w-32 rounded-lg shimmer-skeleton" />
          <div className="h-4 w-24 rounded-lg shimmer-skeleton" />
        </div>
        <div className="h-8 w-20 rounded-lg shimmer-skeleton" />
      </div>
      <div className="flex items-center gap-4 py-4">
        <div className="h-10 w-20 rounded-lg shimmer-skeleton" />
        <div className="flex-1 h-px shimmer-skeleton" />
        <div className="h-10 w-20 rounded-lg shimmer-skeleton" />
      </div>
      <div className="flex gap-3">
        <div className="h-8 w-24 rounded-lg shimmer-skeleton" />
        <div className="h-8 w-24 rounded-lg shimmer-skeleton" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
