/**
 * ConfirmModal
 * Props:
 *   open     boolean
 *   title    string
 *   message  string
 *   onConfirm fn()
 *   onCancel  fn()
 *   danger   boolean  — red confirm button
 *   loading  boolean
 */
export default function ConfirmModal({ open, title, message, onConfirm, onCancel, danger = true, loading = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-panel border border-line p-6 animate-fade-in">
        <h2 className="text-base font-semibold text-head mb-2">{title}</h2>
        <p className="text-sm text-muted leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`text-sm font-medium px-4 py-2 transition-colors
              ${danger
                ? 'bg-red text-white hover:bg-red-light disabled:opacity-40'
                : 'bg-blue text-white hover:bg-blue-light disabled:opacity-40'
              }`}
          >
            {loading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}