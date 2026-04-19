import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((msg, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id))

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
        {toasts.map(({ id, msg, type }) => (
          <div
            key={id}
            className={`flex items-start gap-3 p-3 border text-sm animate-fade-in
              ${type === 'error'   ? 'bg-red-dim border-red text-red-light'     : ''}
              ${type === 'success' ? 'bg-green-dim border-green text-green-light' : ''}
              ${type === 'info'    ? 'bg-panel border-line text-body'            : ''}
            `}
          >
            <span className="flex-1 font-mono text-xs leading-relaxed">{msg}</span>
            <button onClick={() => dismiss(id)} className="text-muted hover:text-head shrink-0 text-base leading-none">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}