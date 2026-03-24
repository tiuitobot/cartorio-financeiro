import { useEffect, useRef, useState } from 'react';
import { FInput, FSel, Btn, ST, CurrencyInput } from '../ui/index.jsx';
import { Badge } from '../ui/index.jsx';

// Tipos de ato disponíveis.
// Valores sem acento — correspondem ao constraint do banco (chk_atos_tipo_ato).
// Labels com acento — exibidos na interface.
const TIPOS_ATO = [
  { value: '',           label: '— Selecione o tipo —' },
  { value: 'escritura',  label: 'Escritura' },
  { value: 'ata',        label: 'Ata Notarial' },
  { value: 'testamento', label: 'Testamento' },
  { value: 'procuracao', label: 'Procuração' },
  { value: 'certidao',   label: 'Certidão' },
  { value: 'apostila',   label: 'Apostila' },
];

// Tipos que nunca geram comissão (espelha TIPOS_SEM_COMISSAO do backend/lib/finance.js)
const TIPOS_SEM_COMISSAO = ['certidao', 'testamento'];
import { padControle, fmtLivro, fmtPagina, fmtRef, fmt, fmtDate } from '../../utils/format.js';
import { FORMAS_PAGAMENTO, normalizeFormaPagamento } from '../../constants.js';
import ModalAjusteComissao from './ModalAjusteComissao.jsx';

function toMoney(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createBlankPagamento() {
  return {
    _tmp: `pg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    valor: 0,
    data_pagamento: '',
    forma_pagamento: '',
    notas: '',
    confirmado_financeiro: false,
    confirmado_financeiro_por: null,
    confirmado_financeiro_em: null,
  };
}

function calcStatus(total, valorPago) {
  if (valorPago <= 0) return 'pendente';
  if (valorPago < total - 0.005) return 'pago_menor';
  if (valorPago > total + 0.005) return 'pago_maior';
  return 'pago';
}

function summarizePagamentos(pagamentos = [], options = {}) {
  const pagamentosValidos = pagamentos.filter((pagamento) => {
    if (toMoney(pagamento.valor) <= 0) return false;
    if (options.confirmedOnly) return pagamento.confirmado_financeiro === true;
    return true;
  });
  const valorPago = pagamentosValidos.reduce((sum, pagamento) => sum + toMoney(pagamento.valor), 0);
  const datas = pagamentosValidos
    .map((pagamento) => pagamento.data_pagamento)
    .filter(Boolean)
    .sort();
  const formas = [...new Set(
    pagamentosValidos
      .map((pagamento) => normalizeFormaPagamento(pagamento.forma_pagamento))
      .filter(Boolean)
  )];

  return {
    valor_pago: Number(valorPago.toFixed(2)),
    data_pagamento: datas.length ? datas[datas.length - 1] : '',
    forma_pagamento: formas.length === 0 ? '' : (formas.length === 1 ? formas[0] : 'Múltiplo'),
  };
}

function buildPagamentoState(pagamentos = []) {
  const lancado = summarizePagamentos(pagamentos);
  const confirmado = summarizePagamentos(pagamentos, { confirmedOnly: true });
  const lancados = pagamentos.filter((pagamento) => toMoney(pagamento.valor) > 0);
  const confirmados = lancados.filter((pagamento) => pagamento.confirmado_financeiro === true);
  const pendentesConfirmacao = Math.max(0, lancados.length - confirmados.length);
  const lastConfirmed = [...confirmados]
    .filter((pagamento) => pagamento.confirmado_financeiro_em)
    .sort((a, b) => String(a.confirmado_financeiro_em).localeCompare(String(b.confirmado_financeiro_em)))
    .pop();

  return {
    lancado,
    confirmado,
    pagamentos_lancados: lancados.length,
    pagamentos_confirmados: confirmados.length,
    pagamentos_pendentes_confirmacao: pendentesConfirmacao,
    tem_pagamento_pendente_confirmacao: pendentesConfirmacao > 0,
    verificado_por: pendentesConfirmacao === 0 && lancados.length > 0 ? lastConfirmed?.confirmado_financeiro_por || null : null,
    verificado_em: pendentesConfirmacao === 0 && lancados.length > 0 ? lastConfirmed?.confirmado_financeiro_em || null : null,
  };
}

function normalizePagamento(pagamento = {}, index = 0) {
  return {
    id: pagamento.id || null,
    _tmp: pagamento._tmp || `pg-existing-${pagamento.id || index}`,
    valor: toMoney(pagamento.valor),
    data_pagamento: pagamento.data_pagamento?.slice(0, 10) || '',
    forma_pagamento: normalizeFormaPagamento(pagamento.forma_pagamento) || '',
    notas: pagamento.notas || '',
    confirmado_financeiro: pagamento.confirmado_financeiro === true,
    confirmado_financeiro_por: pagamento.confirmado_financeiro_por || null,
    confirmado_financeiro_em: pagamento.confirmado_financeiro_em || null,
  };
}

function buildInitialForm(ato) {
  const { _openSection, ...atoBase } = ato || {};
  const pagamentosIniciais = Array.isArray(ato?.pagamentos) && ato.pagamentos.length
    ? ato.pagamentos
        .map((pagamento, index) => normalizePagamento(pagamento, index))
        .filter((pagamento) => toMoney(pagamento.valor) > 0)
    : (ato?.valor_pago > 0 || ato?.data_pagamento || ato?.forma_pagamento
        ? [normalizePagamento({
            valor: ato.valor_pago,
            data_pagamento: ato.data_pagamento,
            forma_pagamento: ato.forma_pagamento,
            confirmado_financeiro: true,
            confirmado_financeiro_por: ato.verificado_por,
            confirmado_financeiro_em: ato.verificado_em,
          })]
        : [createBlankPagamento()]);

  const paymentState = buildPagamentoState(pagamentosIniciais);

  return ato ? {
    ...atoBase,
    data_ato: ato.data_ato?.slice(0, 10) || '',
    pagamentos: pagamentosIniciais,
    valor_pago: paymentState.confirmado.valor_pago,
    valor_pago_confirmado: paymentState.confirmado.valor_pago,
    valor_pago_lancado: paymentState.lancado.valor_pago,
    data_pagamento: paymentState.confirmado.data_pagamento,
    data_pagamento_confirmado: paymentState.confirmado.data_pagamento,
    data_pagamento_lancado: paymentState.lancado.data_pagamento,
    forma_pagamento: paymentState.confirmado.forma_pagamento,
    forma_pagamento_confirmado: paymentState.confirmado.forma_pagamento,
    forma_pagamento_lancado: paymentState.lancado.forma_pagamento,
    status: calcStatus(
      toMoney(ato.total)
        || (toMoney(ato.emolumentos) + toMoney(ato.repasses) + toMoney(ato.issqn) + toMoney(ato.reembolso_tabeliao) + toMoney(ato.reembolso_escrevente)),
      paymentState.confirmado.valor_pago
    ),
    status_calculado: calcStatus(
      toMoney(ato.total)
        || (toMoney(ato.emolumentos) + toMoney(ato.repasses) + toMoney(ato.issqn) + toMoney(ato.reembolso_tabeliao) + toMoney(ato.reembolso_escrevente)),
      paymentState.lancado.valor_pago
    ),
    pagamentos_lancados: paymentState.pagamentos_lancados,
    pagamentos_confirmados: paymentState.pagamentos_confirmados,
    pagamentos_pendentes_confirmacao: paymentState.pagamentos_pendentes_confirmacao,
    tem_pagamento_pendente_confirmacao: paymentState.tem_pagamento_pendente_confirmacao,
    verificado_por: paymentState.verificado_por,
    verificado_em: paymentState.verificado_em,
  } : {
    controle: '',
    livro: '',
    pagina: '',
    tipo_ato: '',
    nome_tomador: '',
    captador_id: null,
    executor_id: null,
    signatario_id: null,
    emolumentos: 0,
    repasses: 0,
    issqn: 0,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    escrevente_reembolso_id: null,
    data_ato: '',
    pagamentos: [createBlankPagamento()],
    valor_pago: 0,
    valor_pago_confirmado: 0,
    valor_pago_lancado: 0,
    data_pagamento: '',
    data_pagamento_confirmado: '',
    data_pagamento_lancado: '',
    forma_pagamento: '',
    forma_pagamento_confirmado: '',
    forma_pagamento_lancado: '',
    status: 'pendente',
    status_calculado: 'pendente',
    verificado_por: null,
    verificado_em: null,
    pagamentos_lancados: 0,
    pagamentos_confirmados: 0,
    pagamentos_pendentes_confirmacao: 0,
    tem_pagamento_pendente_confirmacao: false,
    correcoes: [],
    notas: '',
    comissao_override: null,
  };
}

export default function ModalAto({ ato, onClose, onSave, onSaveStayOpen, escreventes, userRole, userId }) {
  const [form, setForm] = useState(() => buildInitialForm(ato));
  const [corrMsg, setCorrMsg] = useState('');
  const [showAjusteComissao, setShowAjusteComissao] = useState(false);
  const financeSectionRef = useRef(null);

  useEffect(() => {
    setForm(buildInitialForm(ato));
  }, [ato]);

  useEffect(() => {
    if (ato?._openSection !== 'financeiro') return;
    const timer = setTimeout(() => {
      financeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(timer);
  }, [ato]);

  const set = (k, v) => setForm((current) => ({ ...current, [k]: v }));
  const total = toMoney(form.emolumentos) + toMoney(form.repasses) + toMoney(form.issqn) + toMoney(form.reembolso_tabeliao) + toMoney(form.reembolso_escrevente);
  const comissoes = form.comissoes || [];
  const pagamentosValidos = (form.pagamentos || []).filter((pagamento) => toMoney(pagamento.valor) > 0);
  const statusCalculado = calcStatus(total, toMoney(form.valor_pago_lancado));
  const statusConfirmado = calcStatus(total, toMoney(form.valor_pago_confirmado ?? form.valor_pago));

  const reembEsc = (() => {
    const reemEsc = toMoney(form.reembolso_escrevente);
    const vPago = toMoney(form.valor_pago_confirmado ?? form.valor_pago);
    if (reemEsc <= 0 || vPago <= 0) return 0;
    const prior = toMoney(form.emolumentos) + toMoney(form.repasses) + toMoney(form.issqn) + toMoney(form.reembolso_tabeliao);
    const sobra = vPago - prior;
    return sobra > 0 ? Math.min(sobra, reemEsc) : 0;
  })();

  const podeEditar = userRole === 'admin' || userRole === 'financeiro' || userRole === 'chefe_financeiro';
  const podeEditarReembolsoTabeliao = userRole === 'admin' || userRole === 'financeiro' || userRole === 'chefe_financeiro';
  const podeVerCom = podeEditar || (ato && [ato.captador_id, ato.executor_id, ato.signatario_id].includes(userId));
  const hasPersistedAto = Boolean(form.id && typeof form.id === 'number' && form.id < 1e12);
  const conferenceMode = ato?._openSection === 'financeiro';
  const captadorAtual = escreventes.find((escrevente) => escrevente.id === form.captador_id);

  const syncPagamentos = (updater) => {
    setForm((current) => {
      const pagamentos = typeof updater === 'function' ? updater(current.pagamentos || []) : updater;
      const nextPagamentos = pagamentos.length ? pagamentos : [createBlankPagamento()];
      const paymentState = buildPagamentoState(nextPagamentos);

      return {
        ...current,
        pagamentos: nextPagamentos,
        valor_pago: paymentState.confirmado.valor_pago,
        valor_pago_confirmado: paymentState.confirmado.valor_pago,
        valor_pago_lancado: paymentState.lancado.valor_pago,
        data_pagamento: paymentState.confirmado.data_pagamento,
        data_pagamento_confirmado: paymentState.confirmado.data_pagamento,
        data_pagamento_lancado: paymentState.lancado.data_pagamento,
        forma_pagamento: paymentState.confirmado.forma_pagamento,
        forma_pagamento_confirmado: paymentState.confirmado.forma_pagamento,
        forma_pagamento_lancado: paymentState.lancado.forma_pagamento,
        status: calcStatus(
          toMoney(current.emolumentos) + toMoney(current.repasses) + toMoney(current.issqn) + toMoney(current.reembolso_tabeliao) + toMoney(current.reembolso_escrevente),
          paymentState.confirmado.valor_pago
        ),
        status_calculado: calcStatus(
          toMoney(current.emolumentos) + toMoney(current.repasses) + toMoney(current.issqn) + toMoney(current.reembolso_tabeliao) + toMoney(current.reembolso_escrevente),
          paymentState.lancado.valor_pago
        ),
        pagamentos_lancados: paymentState.pagamentos_lancados,
        pagamentos_confirmados: paymentState.pagamentos_confirmados,
        pagamentos_pendentes_confirmacao: paymentState.pagamentos_pendentes_confirmacao,
        tem_pagamento_pendente_confirmacao: paymentState.tem_pagamento_pendente_confirmacao,
        verificado_por: paymentState.verificado_por,
        verificado_em: paymentState.verificado_em,
      };
    });
  };

  const setPagamentoField = (key, field, value) => {
    syncPagamentos((pagamentos) => pagamentos.map((pagamento) => (
      (pagamento.id || pagamento._tmp) === key
        ? { ...pagamento, [field]: field === 'forma_pagamento' ? normalizeFormaPagamento(value) || '' : value }
        : pagamento
    )));
  };

  const addPagamento = () => {
    syncPagamentos((pagamentos) => [...pagamentos, createBlankPagamento()]);
  };

  const removePagamento = (key) => {
    syncPagamentos((pagamentos) => pagamentos.filter((pagamento) => (pagamento.id || pagamento._tmp) !== key));
  };

  const confirmarPagamento = (key) => {
    const nome = { admin: 'Tabelião', financeiro: 'Financeiro', chefe_financeiro: 'Chefe Financeiro' }[userRole] || userRole;
    syncPagamentos((pagamentos) => pagamentos.map((pagamento) => (
      (pagamento.id || pagamento._tmp) === key
        ? {
            ...pagamento,
            confirmado_financeiro: true,
            confirmado_financeiro_por: pagamento.confirmado_financeiro_por || nome,
            confirmado_financeiro_em: pagamento.confirmado_financeiro_em || new Date().toISOString(),
          }
        : pagamento
    )));
  };

  const desfazerConfirmacaoPagamento = (key) => {
    syncPagamentos((pagamentos) => pagamentos.map((pagamento) => (
      (pagamento.id || pagamento._tmp) === key
        ? {
            ...pagamento,
            confirmado_financeiro: false,
            confirmado_financeiro_por: null,
            confirmado_financeiro_em: null,
          }
        : pagamento
    )));
  };

  const confirmarTodosPagamentos = () => {
    const nome = { admin: 'Tabelião', financeiro: 'Financeiro', chefe_financeiro: 'Chefe Financeiro' }[userRole] || userRole;
    syncPagamentos((pagamentos) => pagamentos.map((pagamento) => (
      toMoney(pagamento.valor) > 0
        ? {
            ...pagamento,
            confirmado_financeiro: true,
            confirmado_financeiro_por: pagamento.confirmado_financeiro_por || nome,
            confirmado_financeiro_em: pagamento.confirmado_financeiro_em || new Date().toISOString(),
          }
        : pagamento
    )));
  };

  const addCorrecao = () => {
    if (!corrMsg.trim()) return;
    setForm((current) => ({
      ...current,
      correcoes: [...(current.correcoes || []), { _tmp: Date.now(), autor: 'Financeiro', msg: corrMsg, status: 'aguardando' }],
    }));
    setCorrMsg('');
  };

  const respCorrecao = (key, resp) => setForm((current) => ({
    ...current,
    correcoes: current.correcoes.map((correcao) => (
      (correcao.id || correcao._tmp) === key ? { ...correcao, status: resp } : correcao
    )),
  }));

  const escOpts = [{ value: '', label: '— Nenhum —' }, ...escreventes.map((escrevente) => ({ value: escrevente.id, label: `${escrevente.nome} (${escrevente.taxa}%)` }))];
  const formaOpts = [{ value: '', label: '— Selecione —' }, ...FORMAS_PAGAMENTO.map((forma) => ({ value: forma, label: forma }))];

  const handleSalvarAto = () => onSave(form);
  const handleSalvarConferencia = () => {
    if (onSaveStayOpen) onSaveStayOpen(form);
    else onSave(form);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 880, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 8px 48px #0f2a5540' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', padding: '24px 28px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1 }}>
          <div>
            <div style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Ato Notarial</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginTop: 2 }}>{ato ? `Controle ${padControle(ato.controle)} — ${fmtRef(ato.livro, ato.pagina)}` : 'Novo Ato'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {!conferenceMode && (
          <div>
            <ST>📋 Identificação do Ato</ST>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <FInput label="Nº Controle" value={form.controle} onChange={(e) => set('controle', e.target.value.replace(/\D/g, ''))} disabled={!podeEditar} placeholder="ex: 42" />
                {form.controle && <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3, fontWeight: 600 }}>→ {padControle(form.controle)}</div>}
              </div>
              <div>
                <FInput label="Livro (número)" value={form.livro} onChange={(e) => set('livro', e.target.value.replace(/\D/g, ''))} disabled={!podeEditar} placeholder="ex: 42" />
                {form.livro && <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3, fontWeight: 600 }}>→ {fmtLivro(form.livro)}</div>}
              </div>
              <div>
                <FInput label="Página (número)" value={form.pagina} onChange={(e) => set('pagina', e.target.value.replace(/\D/g, ''))} disabled={!podeEditar} placeholder="ex: 15" />
                {form.pagina && <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3, fontWeight: 600 }}>→ {fmtPagina(form.pagina)}</div>}
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <FInput label="Data do Ato" type="date" value={form.data_ato} onChange={(e) => set('data_ato', e.target.value)} disabled={!podeEditar} />
              </div>
              <div style={{ flex: 1 }}>
                <FInput label="Nome do Tomador / Cliente" value={form.nome_tomador || ''} onChange={(e) => set('nome_tomador', e.target.value)} disabled={!podeEditar} placeholder="Nome completo" />
              </div>
              {form.livro && form.pagina && <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#1e40af', marginTop: 20 }}>Ref: {fmtRef(form.livro, form.pagina)}</div>}
            </div>
            <div style={{ marginTop: 12 }}>
              <FSel
                label="Tipo de Ato"
                options={TIPOS_ATO}
                value={form.tipo_ato || ''}
                onChange={(e) => set('tipo_ato', e.target.value)}
                disabled={!podeEditar}
              />
              {TIPOS_SEM_COMISSAO.includes(form.tipo_ato) && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                  <strong>{TIPOS_ATO.find(t => t.value === form.tipo_ato)?.label}</strong>: este tipo de ato não gera comissão para nenhum escrevente,
                  independentemente de sua taxa contratual ou função.
                </div>
              )}
            </div>
          </div>
          )}

          {!conferenceMode && (
          <div>
            <ST>👥 Escreventes Participantes</ST>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <FSel label="Captador (opcional)" options={escOpts} value={form.captador_id || ''} onChange={(e) => set('captador_id', e.target.value ? Number.parseInt(e.target.value, 10) : null)} disabled={!podeEditar} />
              <FSel label="Executor" options={escOpts} value={form.executor_id || ''} onChange={(e) => set('executor_id', e.target.value ? Number.parseInt(e.target.value, 10) : null)} disabled={!podeEditar} />
              <FSel label="Signatário" options={escOpts} value={form.signatario_id || ''} onChange={(e) => set('signatario_id', e.target.value ? Number.parseInt(e.target.value, 10) : null)} disabled={!podeEditar} />
            </div>
            {!form.captador_id && <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', fontSize: 12, color: '#64748b' }}>ℹ️ Sem captador indicado — nenhuma comissão será devida para este ato.</div>}
          </div>
          )}

          {!conferenceMode && (
          <div>
            <ST>💰 Composição de Valores</ST>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CurrencyInput label="Emolumentos" value={form.emolumentos} onChange={(v) => set('emolumentos', v)} disabled={!podeEditar} />
              <CurrencyInput label="Repasses" value={form.repasses} onChange={(v) => set('repasses', v)} disabled={!podeEditar} />
              <CurrencyInput label="ISSQN" value={form.issqn} onChange={(v) => set('issqn', v)} disabled={!podeEditar} />
              <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Total do Ato</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f' }}>{fmt(total)}</div>
              </div>
              <CurrencyInput label="Reembolso Tabelião" value={form.reembolso_tabeliao} onChange={(v) => set('reembolso_tabeliao', v)} disabled={!podeEditarReembolsoTabeliao} />
              <div>
                <CurrencyInput label="Reembolso Escrevente" value={form.reembolso_escrevente} onChange={(v) => set('reembolso_escrevente', v)} disabled={!podeEditar} />
                {form.reembolso_escrevente > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <FSel label="" options={[{ value: '', label: '— Escrevente que pagou —' }, ...escreventes.map((escrevente) => ({ value: escrevente.id, label: escrevente.nome }))]} value={form.escrevente_reembolso_id || ''} onChange={(e) => set('escrevente_reembolso_id', e.target.value ? Number.parseInt(e.target.value, 10) : null)} disabled={!podeEditar} />
                  </div>
                )}
                {form.reembolso_escrevente > 0 && form.valor_pago > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: reembEsc > 0 ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                    {reembEsc > 0 ? `✅ Devolver ao escrevente: ${fmt(reembEsc)}` : '⚠️ Pagamento insuficiente — reembolso ao escrevente ainda não devido.'}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          <div ref={financeSectionRef}>
            <ST>🏦 Lançamentos e Conferência Financeira</ST>
            {conferenceMode && (
              <div style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #dbe4f0' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                  Modo de conferência financeira
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Controle</div>
                    <div style={{ marginTop: 4, fontWeight: 700, color: '#1e293b' }}>{padControle(form.controle)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Referência</div>
                    <div style={{ marginTop: 4, fontWeight: 700, color: '#1e293b' }}>{fmtRef(form.livro, form.pagina)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Captador</div>
                    <div style={{ marginTop: 4, fontWeight: 700, color: '#1e293b' }}>{captadorAtual?.nome || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total do ato</div>
                    <div style={{ marginTop: 4, fontWeight: 700, color: '#1e293b' }}>{fmt(total)}</div>
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                Como testar esta etapa
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
                1. Lance um ou mais pagamentos.
                <br />
                2. Use <strong>Conferir este lançamento</strong> em cada item, ou <strong>Conferir todos os lançamentos</strong>.
                <br />
                3. O <strong>Status oficial</strong> só considera o que já foi conferido pelo financeiro.
                <br />
                4. Atos antigos já lançados aparecem aqui automaticamente como lançamento legado, prontos para conferência.
              </div>
            </div>
            <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Lançamentos</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: '#1e3a5f' }}>{form.pagamentos_lancados || 0}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #86efac' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Conferidos</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: '#15803d' }}>{form.pagamentos_confirmados || 0}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#fff7ed', border: '1px solid #fdba74' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pendentes de conferência</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: '#c2410c' }}>{form.pagamentos_pendentes_confirmacao || 0}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(form.pagamentos || []).map((pagamento, index) => {
                const pagamentoKey = pagamento.id || pagamento._tmp;

                return (
                  <div key={pagamentoKey} style={{ border: '1px solid #dbe4f0', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 13 }}>Lançamento {index + 1}</div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: pagamento.confirmado_financeiro ? '#15803d' : '#b45309', background: pagamento.confirmado_financeiro ? '#dcfce7' : '#fef3c7', border: `1px solid ${pagamento.confirmado_financeiro ? '#86efac' : '#fde68a'}`, borderRadius: 999, padding: '4px 8px' }}>
                          {pagamento.confirmado_financeiro ? 'Conferido' : 'Pendente de conferência'}
                        </span>
                      </div>
                      {podeEditar && (
                        <Btn variant="secondary" onClick={() => removePagamento(pagamentoKey)} style={{ padding: '4px 10px', fontSize: 12 }}>Remover</Btn>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <CurrencyInput label="Valor Pago" value={pagamento.valor} onChange={(value) => setPagamentoField(pagamentoKey, 'valor', value)} disabled={!podeEditar} />
                      <FInput label="Data do Pagamento" type="date" value={pagamento.data_pagamento || ''} onChange={(e) => setPagamentoField(pagamentoKey, 'data_pagamento', e.target.value)} disabled={!podeEditar} />
                      <FSel label="Forma de Pagamento" options={formaOpts} value={pagamento.forma_pagamento || ''} onChange={(e) => setPagamentoField(pagamentoKey, 'forma_pagamento', e.target.value)} disabled={!podeEditar} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <FInput label="Observações do pagamento" value={pagamento.notas || ''} onChange={(e) => setPagamentoField(pagamentoKey, 'notas', e.target.value)} disabled={!podeEditar} placeholder="Opcional" />
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, color: pagamento.confirmado_financeiro ? '#15803d' : '#b45309', fontWeight: 700 }}>
                        {pagamento.confirmado_financeiro
                          ? `✅ Conferido${pagamento.confirmado_financeiro_por ? ` por ${pagamento.confirmado_financeiro_por}` : ''}${pagamento.confirmado_financeiro_em ? ` em ${fmtDate(pagamento.confirmado_financeiro_em)}` : ''}`
                          : '⏳ Lançado e aguardando conferência financeira'}
                      </div>
                      {podeEditar && toMoney(pagamento.valor) > 0 && (
                        pagamento.confirmado_financeiro ? (
                          <Btn variant="secondary" onClick={() => desfazerConfirmacaoPagamento(pagamentoKey)} style={{ padding: '4px 10px', fontSize: 12 }}>
                            Marcar como não conferido
                          </Btn>
                        ) : (
                          <Btn variant="success" onClick={() => confirmarPagamento(pagamentoKey)} style={{ padding: '4px 10px', fontSize: 12 }}>
                            Conferir este lançamento
                          </Btn>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {podeEditar && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={addPagamento}>+ Adicionar lançamento</Btn>
                {pagamentosValidos.some((pagamento) => !pagamento.confirmado_financeiro) && (
                  <Btn variant="success" onClick={confirmarTodosPagamentos}>✅ Conferir todos os lançamentos</Btn>
                )}
                {pagamentosValidos.length > 0 && (
                  <Btn variant="warning" onClick={handleSalvarConferencia}>
                    {hasPersistedAto ? '💾 Salvar conferência financeira' : '💾 Criar ato e salvar conferência'}
                  </Btn>
                )}
              </div>
            )}

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Lançado</div>
                <div style={{ marginTop: 4, color: '#1e3a5f', fontWeight: 700 }}>{fmt(form.valor_pago_lancado)} em {form.pagamentos_lancados || 0} lançamento(s)</div>
                <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>
                  Última data: {form.data_pagamento_lancado || '—'} | Forma resumo: {form.forma_pagamento_lancado || '—'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: form.valor_pago_confirmado < total ? '#fff7ed' : form.valor_pago_confirmado > total ? '#eff6ff' : '#f0fdf4', border: `1px solid ${form.valor_pago_confirmado < total ? '#fdba74' : form.valor_pago_confirmado > total ? '#93c5fd' : '#86efac'}` }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Conferido pelo financeiro</div>
                <div style={{ marginTop: 4, fontWeight: 700, color: form.valor_pago_confirmado < total ? '#c2410c' : form.valor_pago_confirmado > total ? '#1d4ed8' : '#15803d' }}>
                  {form.valor_pago_confirmado < total ? `⚠️ Confirmado: ${fmt(form.valor_pago_confirmado)} | Falta conferir ${fmt(total - form.valor_pago_confirmado)}` : form.valor_pago_confirmado > total ? `ℹ️ Confirmado a maior: ${fmt(form.valor_pago_confirmado - total)}` : '✅ Pagamento integral confirmado'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FSel
                label="Situação lançada"
                options={[
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'pago', label: 'Pago' },
                  { value: 'pago_menor', label: 'Pago a menor' },
                  { value: 'pago_maior', label: 'Pago a maior' },
                ]}
                value={statusCalculado}
                onChange={() => {}}
                disabled
              />
              <FSel
                label="Status oficial"
                options={[
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'pago', label: 'Pago' },
                  { value: 'pago_menor', label: 'Pago a menor' },
                  { value: 'pago_maior', label: 'Pago a maior' },
                ]}
                value={statusConfirmado}
                onChange={() => {}}
                disabled
              />
            </div>

            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: form.verificado_por ? '#f0fdf4' : '#fef2f2', border: `1px solid ${form.verificado_por ? '#86efac' : '#fecaca'}` }}>
              {form.verificado_por ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>Todos os pagamentos lançados já foram conferidos</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Por {form.verificado_por}{form.verificado_em ? ` em ${form.verificado_em}` : ' — data definida ao salvar'}</div>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
                  {form.pagamentos_lancados > 0
                    ? `${form.pagamentos_pendentes_confirmacao || 0} lançamento(s) aguardando conferência financeira`
                    : 'Nenhum pagamento lançado'}
                </span>
              )}
            </div>
          </div>

          {!conferenceMode && podeVerCom && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #e8edf5', paddingBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>📊 Comissões Calculadas</span>
                {userRole === 'admin' && ato && <Btn variant="warning" onClick={() => setShowAjusteComissao(true)} style={{ fontSize: 12, padding: '5px 12px' }}>✏️ Ajuste Manual</Btn>}
              </div>
              {comissoes.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Nenhuma comissão — ato sem captador.</div>
              ) : (
                <>
                  {form.comissao_override && <div style={{ marginBottom: 8, padding: '6px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>⚠️ Valores ajustados manualmente pelo Tabelião.</div>}
                  {comissoes.map((comissao, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                      <div><span style={{ fontWeight: 700, color: '#1e293b' }}>{comissao.nome ?? comissao.escrevente?.nome}</span><span style={{ marginLeft: 8, color: '#64748b', fontSize: 13 }}>({comissao.papel})</span></div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{comissao.pct ? `${comissao.pct}% de ${fmt(form.emolumentos)}${comissao.fixo ? ' − R$20,00' : ''} = ` : 'Valor fixo = '}</span>
                        <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 16 }}>{fmt(comissao.total)}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '8px 16px', background: '#1e3a5f11', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#1e3a5f' }}>Total Comissões</span>
                    <span style={{ fontWeight: 700, color: '#1e3a5f' }}>{fmt(comissoes.reduce((sum, comissao) => sum + comissao.total, 0))}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {!conferenceMode && ato && (
            <div>
              <ST>🔍 Histórico de Correções</ST>
              {form.correcoes.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>Nenhuma correção registrada.</div>}
              {form.correcoes.map((correcao) => (
                <div key={correcao.id || correcao._tmp} style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#92400e', fontSize: 13 }}>{correcao.autor}{correcao.data ? ` — ${correcao.data}` : ' — Definida ao salvar'}</span>
                    <Badge label={correcao.status === 'aguardando' ? 'Aguardando' : correcao.status === 'aprovado' ? 'Aprovado' : 'Contestado'} color={correcao.status === 'aprovado' ? '#22c55e' : correcao.status === 'contestado' ? '#ef4444' : '#f59e0b'} />
                  </div>
                  <div style={{ fontSize: 14 }}>{correcao.mensagem ?? correcao.msg}</div>
                  {correcao.status === 'aguardando' && userRole === 'escrevente' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Btn variant="success" onClick={() => respCorrecao(correcao.id || correcao._tmp, 'aprovado')}>✅ Aprovar</Btn>
                      <Btn variant="danger" onClick={() => respCorrecao(correcao.id || correcao._tmp, 'contestado')}>❌ Contestar</Btn>
                    </div>
                  )}
                </div>
              ))}
              {podeEditar && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input value={corrMsg} onChange={(e) => setCorrMsg(e.target.value)} placeholder="Registrar correção..." style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }} />
                  <Btn onClick={addCorrecao}>Registrar</Btn>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
            {!conferenceMode && podeEditar && <Btn onClick={handleSalvarAto}>💾 Salvar ato</Btn>}
          </div>
        </div>
      </div>

      {showAjusteComissao && (
        <ModalAjusteComissao
          ato={form}
          comissoes={comissoes}
          onClose={() => setShowAjusteComissao(false)}
          onSave={(override) => {
            set('comissao_override', override);
            setShowAjusteComissao(false);
          }}
        />
      )}
    </div>
  );
}
