import { Star } from 'lucide-react'

export default function StarRating({ value, count, size = 14 }: { value?: number | null; count?: number; size?: number }) {
  const rounded = Math.round(value || 0)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#F59E0B' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          style={{ fill: i <= rounded ? 'currentColor' : 'transparent' }}
          className="opacity-80"
        />
      ))}
      {typeof value === 'number' && (
        <span style={{ marginLeft: 3, fontSize: 13, fontWeight: 600, color: '#374151' }}>{value.toFixed(1)}</span>
      )}
      {typeof count === 'number' && count > 0 && (
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>({count})</span>
      )}
    </span>
  )
}