import { STATUS_PEDIDO } from '../constants'

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_PEDIDO[status] || { label: status, bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.text,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 8, background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}