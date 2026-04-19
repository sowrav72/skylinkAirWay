export default function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'
  return (
    <span className={`${s} border-2 border-line border-t-blue animate-spin rounded-full inline-block`} />
  )
}