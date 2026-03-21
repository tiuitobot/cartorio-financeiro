import { useId } from 'react';
import StickyXScroll from './StickyXScroll.jsx';
export { FilterChip, ActiveFilterTag, Sheet } from './FilterControls.jsx';

const fieldLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

function useFieldId(id, prefix) {
  const generatedId = useId().replace(/:/g, '');
  return id || `${prefix}-${generatedId}`;
}

export const Badge = ({ label, color }) => (
  <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
    {label}
  </span>
);

export const Card = ({ children, style = {} }) => (
  <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 16px #0f2a5511', border: '1px solid #e8edf5', padding: 24, ...style }}>
    {children}
  </div>
);

export const FInput = ({ label, id, style, ...props }) => {
  const fieldId = useFieldId(id, 'input');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label htmlFor={fieldId} style={fieldLabelStyle}>{label}</label>}
      <input id={fieldId} {...props} style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#1e293b', outline: 'none', background: props.disabled ? '#f1f5f9' : '#f8fafc', ...style }} />
    </div>
  );
};

export const FSel = ({ label, id, options, style, ...props }) => {
  const fieldId = useFieldId(id, 'select');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label htmlFor={fieldId} style={fieldLabelStyle}>{label}</label>}
      <select id={fieldId} {...props} style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none', ...style }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

export const Btn = ({ children, variant = 'primary', ...props }) => {
  const vs = {
    primary:   { background: '#1e3a5f', color: '#fff' },
    secondary: { background: '#f1f5f9', color: '#1e293b' },
    danger:    { background: '#fee2e2', color: '#ef4444' },
    success:   { background: '#dcfce7', color: '#16a34a' },
    warning:   { background: '#fef3c7', color: '#92400e' },
  };
  return (
    <button {...props} style={{ ...vs[variant], border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', ...props.style }}>
      {children}
    </button>
  );
};

// Section title
export const ST = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, borderBottom: '2px solid #e8edf5', paddingBottom: 6 }}>
    {children}
  </div>
);

export function CurrencyInput({ label, id, value = 0, onChange, disabled, style }) {
  const fieldId = useFieldId(id, 'currency');
  const centValue = Math.round((value || 0) * 100);
  const display = (centValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const handleChange = e => {
    if (disabled) return;
    const digits = e.target.value.replace(/\D/g, '');
    onChange(parseInt(digits || '0', 10) / 100);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label htmlFor={fieldId} style={fieldLabelStyle}>{label}</label>}
      <input
        id={fieldId}
        value={display}
        onChange={handleChange}
        disabled={disabled}
        inputMode="numeric"
        style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#1e293b', outline: 'none', background: disabled ? '#f1f5f9' : '#f8fafc', textAlign: 'right', ...style }}
      />
    </div>
  );
}

export { StickyXScroll };
