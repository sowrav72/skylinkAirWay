/**
 * Pagination
 * Props: total, limit, offset, onPage fn(newOffset)
 */
export default function Pagination({ total, limit, offset, onPage }) {
  if (total <= limit) return null
  const totalPages  = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="flex items-center justify-between pt-4 border-t border-line mt-4">
      <span className="text-xs font-mono text-dim">
        {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          disabled={offset === 0}
          onClick={() => onPage(Math.max(0, offset - limit))}
          className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30"
        >
          ← Prev
        </button>
        <span className="text-xs font-mono text-muted self-center px-2">
          {currentPage} / {totalPages}
        </span>
        <button
          disabled={offset + limit >= total}
          onClick={() => onPage(offset + limit)}
          className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  )
}