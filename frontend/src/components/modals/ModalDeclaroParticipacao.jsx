import { useState } from 'react';
import { FInput, Btn } from '../ui/index.jsx';
import { padControle, fmtRef, fmtDate } from '../../utils/format.js';
import { parseRef } from '../../utils/format.js';

// Fix C7: removido id: Date.now() — o ID real vem do backend após POST /reivindicacoes.
export default function ModalDeclaroParticipacao({ userId, atos, escreventes, onClose, onSubmit }) {
  const [busca, setBusca] = useState('');
  const [funcao, setFuncao] = useState('executor');
  const [atoEncontrado, setAtoEncontrado] = useState(null);
  const [erro, setErro] = useState('');

  const buscarAto = () => {
    if (!busca.trim()) { setErro('Informe o controle ou a referência L00P000.'); return; }
    const ref = parseRef(busca);
    let ato;
    if (ref) {
      ato = atos.find(a => parseInt(a.livro) === ref.livro && parseInt(a.pagina) === ref.pagina);
    } else {
      const b = busca.replace(/\D/g, '').padStart(5, '0');
      ato = atos.find(a => padControle(a.controle) === b);
    }
    if (!ato) { setErro('Ato não encontrado. Verifique o número de controle ou referência.'); setAtoEncontrado(null); }
    else { setAtoEncontrado(ato); setErro(''); }
  };

  // Vínculo de compartilhamento NÃO é participação.
  // A verificação deve ser feita por função, não por presença genérica no ato.
  // Regras:
  //   - Captador: não pode ser reivindicado via "Declaro Participação" (é definido no lançamento)
  //   - Executor: bloqueado apenas se userId já é o executor_id do ato
  //   - Signatário: bloqueado apenas se userId já é o signatario_id do ato
  // Consequência: um captador PODE declarar participação como executor ou signatário do mesmo ato.
  const jaOcupaFuncao = atoEncontrado
    ? funcao === 'executor'
      ? atoEncontrado.executor_id === userId
      : atoEncontrado.signatario_id === userId
    : false;

  // Aviso informativo (não bloqueante) quando o escrevente já é captador do ato
  const eCaptador = atoEncontrado && atoEncontrado.captador_id === userId;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '22px 28px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Reivindicação de Participação</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 2 }}>Declaro Participação</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e40af' }}>
            Use este formulário para declarar sua participação em um ato que já está no sistema mas não registra sua função.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <FInput label="Controle ou Referência" value={busca} onChange={e => { setBusca(e.target.value); setAtoEncontrado(null); setErro(''); }} placeholder="ex: 00042 ou L42P15" />
            </div>
            <div style={{ marginTop: 20 }}><Btn onClick={buscarAto} style={{ padding: '9px 16px' }}>🔍 Buscar</Btn></div>
          </div>
          {erro && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{erro}</div>}
          {atoEncontrado && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>Ato encontrado</div>
              <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div><span style={{ color: '#64748b' }}>Controle: </span><strong>{padControle(atoEncontrado.controle)}</strong></div>
                <div><span style={{ color: '#64748b' }}>Referência: </span><strong>{fmtRef(atoEncontrado.livro, atoEncontrado.pagina)}</strong></div>
                <div><span style={{ color: '#64748b' }}>Data: </span><strong>{fmtDate(atoEncontrado.data_ato)}</strong></div>
                <div><span style={{ color: '#64748b' }}>Captador: </span><strong>{escreventes.find(e => e.id === atoEncontrado.captador_id)?.nome || '—'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Executor: </span><strong>{escreventes.find(e => e.id === atoEncontrado.executor_id)?.nome || 'Não definido'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Signatário: </span><strong>{escreventes.find(e => e.id === atoEncontrado.signatario_id)?.nome || 'Não definido'}</strong></div>
              </div>
              {eCaptador && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
                  Você é o captador deste ato. Ainda assim pode declarar participação como Executor ou Signatário, se for o caso.
                </div>
              )}
              {jaOcupaFuncao && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  Você já está registrado como <strong>{funcao === 'executor' ? 'Executor' : 'Signatário'}</strong> neste ato.
                </div>
              )}
            </div>
          )}
          {atoEncontrado && !jaOcupaFuncao && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Minha função neste ato</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['executor', 'signatario'].map(f => (
                  <button key={f} onClick={() => setFuncao(f)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: `2px solid ${funcao === f ? '#1e3a5f' : '#e2e8f0'}`, background: funcao === f ? '#1e3a5f' : '#f8fafc', color: funcao === f ? '#fff' : '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    {f === 'executor' ? 'Executor' : 'Signatário'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
            {atoEncontrado && !jaOcupaFuncao && (
              <Btn onClick={() => onSubmit({ ato_id: atoEncontrado.id, funcao })}>
                📝 Enviar Declaração
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
