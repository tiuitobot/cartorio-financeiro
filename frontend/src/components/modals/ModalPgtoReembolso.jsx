import { useState } from 'react';
import { FInput, Btn, CurrencyInput } from '../ui/index.jsx';

// Fix C7: removido id: Date.now() — o ID real vem do backend após POST /reembolsos.
export default function ModalPgtoReembolso({ escrevente, onClose, onSave }) {
  const [form, setForm] = useState({ data: new Date().toISOString().split('T')[0], valor: 0, notas: '' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Reembolso Escrevente</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginTop: 2 }}>{escrevente.nome}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FInput label="Data do Pagamento" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          <CurrencyInput label="Valor Pago" value={form.valor} onChange={v => setForm(f => ({ ...f, valor: v }))} />
          <FInput label="Observações" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Opcional..." />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={() => { if (form.valor > 0) onSave({ ...form, escrevente_id: escrevente.id, confirmado_escrevente: false }); }}>💾 Registrar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
