import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const maxW = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg'

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box w-full ${maxW}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-700">
          <h2 className="font-display font-bold text-white text-base">{title}</h2>
          <button onClick={onClose} className="btn-icon border-0 hover:bg-base-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
