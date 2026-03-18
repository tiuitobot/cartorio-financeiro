import { useState } from 'react';
import { Btn, CurrencyInput } from '../ui/index.jsx';
import { padControle, fmt } from '../../utils/format.js';

export default function ModalAjusteComissao({ ato, comissoes, onClose, onSave }) {
  const comissoesPadrao = comissoes;
  const [overrides, setOverrides] = useState(comissoesPadrao.map(c => ({ ...c, total_custom: c.total })));
  const set = (i, v) => setOverrides(prev => prev.map((o, idx) => idx === i ? { ...o, total_custom: v } : o));

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Ajuste Manual</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginTop: 2 }}>Comissões — Controle {padControle(ato.controle)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
            ⚠️ Os valores padrão calculados automaticamente são exibidos abaixo. Altere apenas se necessário.
          </div>
          {overrides.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.nome ?? o.escrevente?.nome}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{o.papel} — Padrão: {fmt(o.total)}</div>
              </div>
              <CurrencyInput value={o.total_custom} onChange={v => set(i, v)} style={{ width: 120 }} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Btn variant="danger" onClick={() => onSave(null)} style={{ fontSize: 13, padding: '7px 14px' }}>↩ Restaurar padrão</Btn>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
              <Btn onClick={() => onSave(overrides.map(o => ({ ...o, total: o.total_custom })))}>💾 Salvar Ajuste</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
