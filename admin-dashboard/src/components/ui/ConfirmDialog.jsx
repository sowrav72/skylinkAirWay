import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-lg bg-crimson-500/10 border border-crimson-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-crimson-400" />
        </div>
        <p className="text-base-300 text-sm leading-relaxed font-body mt-1">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
        <button onClick={onConfirm} className={`btn ${danger ? 'btn-danger' : 'btn-teal'}`}>
          Confirm
        </button>
      </div>
    </Modal>
  )
}
