export function FilterChip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? '1px solid #1d4ed8' : '1px solid #dbe4f0',
        background: active ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : '#fff',
        color: active ? '#fff' : '#475569',
        boxShadow: active ? '0 8px 18px #2563eb22' : 'none',
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all .15s ease',
      }}
    >
      {children}
    </button>
  );
}

export function ActiveFilterTag({ label, onRemove }) {
  return (
    <button
      onClick={onRemove}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid #bfdbfe',
        background: '#eff6ff',
        color: '#1d4ed8',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11 }}>✕</span>
    </button>
  );
}

// width: largura do painel. Padrão 420px (filtros). Passar '60vw' para painéis de detalhe.
export function Sheet({ open, title, subtitle, onClose, children, footer, width = '420px' }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a66',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: `min(${width}, 100vw)`,
          height: '100%',
          background: 'linear-gradient(180deg,#ffffff,#f8fbff)',
          borderLeft: '1px solid #dbe4f0',
          boxShadow: '-18px 0 40px #0f172a22',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{title}</div>
              {subtitle && <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{subtitle}</div>}
            </div>
            <button
              onClick={onClose}
              style={{
                border: '1px solid #dbe4f0',
                background: '#fff',
                color: '#475569',
                borderRadius: 12,
                width: 36,
                height: 36,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: 20, borderTop: '1px solid #e2e8f0', background: '#fff' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
