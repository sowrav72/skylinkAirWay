export default function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div className="border border-red bg-red-dim text-red-light text-xs font-mono p-3 leading-relaxed">
      ⚠ {message}
    </div>
  )
}