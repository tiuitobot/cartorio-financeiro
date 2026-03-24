import { useMemo, useState } from 'react';
import { Btn, CurrencyInput, FInput } from '../ui/index.jsx';
import { fmtDate, padControle } from '../../utils/format.js';

function buildInitialForm(initialData) {
  if (initialData) {
    return {
      controle_ref: initialData.controle_ref || '',
      data_registro: initialData.data_registro?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      valor: Number(initialData.valor || 0),
      descricao: initialData.descricao || '',
      cartorio_nome: initialData.cartorio_nome || '',
      protocolo: initialData.protocolo || '',
      observacoes: initialData.observacoes || '',
    };
  }

  return {
    controle_ref: '',
    data_registro: new Date().toISOString().slice(0, 10),
    valor: 0,
    descricao: '',
    cartorio_nome: '',
    protocolo: '',
    observacoes: '',
  };
}

function statusLabel(status) {
  return ({
    pago: 'Pago',
    pago_menor: 'Pago a menor',
    pago_maior: 'Pago a maior',
    pendente: 'Pendente',
  })[status] || status || 'Sem status';
}

export default function ModalDespesaRegistro({ initialData = null, atos = [], onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => buildInitialForm(initialData));
  const [erro, setErro] = useState('');
  const isEditing = Boolean(initialData?.id);
  const atosByControle = useMemo(
    () => new Map(atos.map((ato) => [padControle(ato.controle), ato])),
    [atos]
  );
  const matchedAto = useMemo(
    () => atosByControle.get(padControle(form.controle_ref || '')) || null,
    [atosByControle, form.controle_ref]
  );
  const matchedAtoLabel = useMemo(() => {
    if (!matchedAto) return null;
    return `${padControle(matchedAto.controle)} • ${matchedAto.livro}/${matchedAto.pagina} • ${fmtDate(matchedAto.data_ato)}`;
  }, [matchedAto]);
  const despesaAposPagamento = useMemo(
    () => Boolean(
      matchedAto?.data_pagamento
      && form.data_registro
      && form.data_registro >= matchedAto.data_pagamento
    ),
    [form.data_registro, matchedAto]
  );

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setErro('');
      await onSave?.(form);
    } catch (error) {
      setErro(error.message || 'Erro ao salvar despesa de registro');
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!window.confirm('Excluir esta despesa de registro?')) return;

    try {
      setErro('');
      await onDelete?.(initialData.id);
    } catch (error) {
      setErro(error.message || 'Erro ao excluir despesa de registro');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '20px 24px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Despesas de Registro</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginTop: 2 }}>
              {isEditing ? 'Editar Despesa de Registro' : 'Nova Despesa de Registro'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {matchedAtoLabel && (
            <div style={{ borderRadius: 12, border: '1px solid #bfdbfe', background: '#eff6ff', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 4 }}>Ato Encontrado</div>
              <div style={{ fontSize: 13, color: '#1e3a5f', fontWeight: 600 }}>{matchedAtoLabel}</div>
            </div>
          )}
          {despesaAposPagamento && (
            <div style={{ borderRadius: 12, border: '1px solid #fcd34d', background: '#fffbeb', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', marginBottom: 4 }}>Impacto Financeiro</div>
              <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                Ato {matchedAto?.livro}/{matchedAto?.pagina} já {statusLabel(matchedAto?.status).toLowerCase()} em {fmtDate(matchedAto?.data_pagamento)}.
              </div>
              <div style={{ fontSize: 12, color: '#a16207', marginTop: 4 }}>
                Esta despesa permanece no módulo de registro e não recalcula o status financeiro do ato.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FInput label="Controle" value={form.controle_ref} onChange={(e) => setField('controle_ref', e.target.value)} />
            <FInput label="Data do Registro" type="date" value={form.data_registro} onChange={(e) => setField('data_registro', e.target.value)} />
            <CurrencyInput label="Valor" value={form.valor} onChange={(value) => setField('valor', value)} />
          </div>

          <FInput label="Descrição" value={form.descricao} onChange={(e) => setField('descricao', e.target.value)} placeholder="Ex.: Prenotação de imóvel" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FInput label="Cartório" value={form.cartorio_nome} onChange={(e) => setField('cartorio_nome', e.target.value)} placeholder="Ex.: 2º Registro de Imóveis" />
            <FInput label="Protocolo" value={form.protocolo} onChange={(e) => setField('protocolo', e.target.value)} placeholder="Opcional" />
          </div>
          <FInput label="Observações" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} placeholder="Opcional" />

          {erro && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{erro}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              {isEditing && (
                <Btn variant="danger" onClick={handleDelete}>🗑️ Excluir</Btn>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
              <Btn onClick={handleSave}>💾 Salvar</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
