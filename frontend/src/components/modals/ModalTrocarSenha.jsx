import { useState } from 'react';
import { FInput, Btn } from '../ui/index.jsx';
import { api } from '../../api.js';

export default function ModalTrocarSenha({ onClose }) {
  const [atual, setAtual]     = useState('');
  const [nova, setNova]       = useState('');
  const [confirma, setConfirma] = useState('');
  const [msg, setMsg]         = useState('');
  const [erro, setErro]       = useState('');

  const handleSalvar = async () => {
    if (!atual || !nova) { setErro('Preencha todos os campos.'); return; }
    if (nova !== confirma) { setErro('Nova senha e confirmação não coincidem.'); return; }
    if (nova.length < 6) { setErro('Nova senha deve ter ao menos 6 caracteres.'); return; }
    try {
      await api.trocarSenha(atual, nova);
      setMsg('Senha alterada com sucesso!'); setErro('');
      setTimeout(onClose, 1500);
    } catch (e) { setErro(e.message); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>🔒 Trocar Senha</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FInput label="Senha atual"          type="password" value={atual}    onChange={e => setAtual(e.target.value)} />
          <FInput label="Nova senha"           type="password" value={nova}     onChange={e => setNova(e.target.value)} />
          <FInput label="Confirmar nova senha" type="password" value={confirma} onChange={e => setConfirma(e.target.value)} />
          {erro && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{erro}</div>}
          {msg  && <div style={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>{msg}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={handleSalvar}>Salvar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
