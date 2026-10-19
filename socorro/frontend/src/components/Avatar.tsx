import { User } from 'lucide-react'

export default function Avatar({
  src,
  nome,
  size = 44,
}: {
  src?: string | null
  nome?: string
  size?: number
}) {
  const initials = (nome || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {src ? (
        <img
          src={src}
          alt={nome || 'Perfil'}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FEE2E2',
            color: '#B91C1C',
            fontWeight: 700,
            fontSize: size * 0.38,
          }}
        >
          {initials || <User size={size * 0.5} />}
        </div>
      )}
    </div>
  )
}