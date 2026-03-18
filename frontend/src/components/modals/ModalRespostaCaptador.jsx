import { useState } from 'react';
import { Btn } from '../ui/index.jsx';

export default function ModalRespostaCaptador({ reiv, escreventes, onClose, onSave }) {
  const [justificativa, setJustificativa] = useState('');
  const esc = escreventes.find(e => e.id === reiv.escrevente_id);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Resposta à Reivindicação</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginTop: 2 }}>{esc?.nome} — {reiv.funcao === 'executor' ? 'Executor' : 'Signatário'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1e293b', border: '1px solid #e2e8f0' }}>
            <strong>{esc?.nome}</strong> declara ter participado como <strong>{reiv.funcao === 'executor' ? 'Executor' : 'Signatário'}</strong> em {reiv.data}.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="success" style={{ flex: 1 }} onClick={() => onSave({ ...reiv, status: 'aceita' })}>✅ Aceitar</Btn>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Ou recusar com justificativa</label>
            <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3} placeholder="Descreva o motivo da recusa..." style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            <Btn variant="danger" style={{ marginTop: 8, width: '100%' }} onClick={() => { if (justificativa.trim()) onSave({ ...reiv, status: 'recusada', justificativa }); }}>❌ Recusar com justificativa</Btn>
          </div>
          <Btn variant="secondary" onClick={onClose} style={{ width: '100%' }}>Fechar</Btn>
        </div>
      </div>
    </div>
  );
}
