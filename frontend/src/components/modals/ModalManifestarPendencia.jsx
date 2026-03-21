import { useState } from 'react';
import { Btn, FInput } from '../ui/index.jsx';

export default function ModalManifestarPendencia({ onClose, onSubmit }) {
  const [controle, setControle] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(null);

  async function submit(confirmarSemRelacao = false) {
    setLoading(true);
    setErro('');

    try {
      await onSubmit({
        controle,
        mensagem,
        confirmar_sem_relacao: confirmarSemRelacao,
      });
    } catch (error) {
      if (error?.data?.requer_confirmacao) {
        setConfirmacaoPendente(error.data.ato || null);
      } else {
        setErro(error.message || 'Erro ao manifestar pendência');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a66', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
      <div style={{ width: 'min(640px, 100%)', background: '#fff', borderRadius: 16, boxShadow: '0 25px 80px #0f172a30', border: '1px solid #dbe4f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
          <div style={{ color: '#2563eb', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Pendências</div>
          <div style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, marginTop: 4 }}>Manifestar Pendência</div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
            Informe o controle e registre a manifestação. Se o ato não estiver ligado ao seu nome, o sistema vai pedir confirmação extra.
          </div>
        </div>

        <div style={{ padding: 22, display: 'grid', gap: 16 }}>
          {erro && (
            <div style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
              {erro}
            </div>
          )}

          {confirmacaoPendente && (
            <div style={{ border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', borderRadius: 12, padding: '14px 16px', display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Esse controle não está relacionado ao seu nome.</div>
              <div style={{ fontSize: 13 }}>
                Controle {confirmacaoPendente.controle} {confirmacaoPendente.livro && confirmacaoPendente.pagina ? `| ${confirmacaoPendente.livro}/${confirmacaoPendente.pagina}` : ''}
              </div>
              <div style={{ fontSize: 12 }}>
                Se continuar, a manifestação será registrada, mas o acesso aos dados do ato seguirá restrito até tratamento pelo financeiro.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <Btn variant="warning" onClick={() => submit(true)} disabled={loading} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Confirmar mesmo assim
                </Btn>
                <Btn variant="secondary" onClick={() => setConfirmacaoPendente(null)} disabled={loading} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Rever controle
                </Btn>
              </div>
            </div>
          )}

          <FInput
            label="Controle"
            placeholder="00042"
            value={controle}
            onChange={(e) => setControle(e.target.value)}
            disabled={loading}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Manifestação
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              disabled={loading}
              placeholder="Descreva a pendência com objetividade."
              rows={6}
              style={{
                border: '1.5px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: 14,
                color: '#1e293b',
                outline: 'none',
                resize: 'vertical',
                background: loading ? '#f1f5f9' : '#f8fafc',
              }}
            />
          </div>
        </div>

        <div style={{ padding: 20, borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <Btn variant="secondary" onClick={onClose} disabled={loading}>
            Fechar
          </Btn>
          <Btn onClick={() => submit(false)} disabled={loading}>
            {loading ? 'Salvando...' : 'Registrar manifestação'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
