import { useState } from 'react';
import { FInput, FSel, Btn, ST, CurrencyInput } from '../ui/index.jsx';
import { Badge } from '../ui/index.jsx';
import { padControle, fmtLivro, fmtPagina, fmtRef, fmt } from '../../utils/format.js';
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
  };
}

function calcStatus(total, valorPago) {
  if (valorPago <= 0) return 'pendente';
  if (valorPago < total - 0.005) return 'pago_menor';
  if (valorPago > total + 0.005) return 'pago_maior';
  return 'pago';
}

function summarizePagamentos(pagamentos = []) {
  const pagamentosValidos = pagamentos.filter((pagamento) => toMoney(pagamento.valor) > 0);
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

function normalizePagamento(pagamento = {}, index = 0) {
  return {
    id: pagamento.id || null,
    _tmp: pagamento._tmp || `pg-existing-${pagamento.id || index}`,
    valor: toMoney(pagamento.valor),
    data_pagamento: pagamento.data_pagamento?.slice(0, 10) || '',
    forma_pagamento: normalizeFormaPagamento(pagamento.forma_pagamento) || '',
    notas: pagamento.notas || '',
  };
}

function buildInitialForm(ato) {
  const pagamentosIniciais = Array.isArray(ato?.pagamentos) && ato.pagamentos.length
    ? ato.pagamentos.map((pagamento, index) => normalizePagamento(pagamento, index))
    : (ato?.valor_pago > 0 || ato?.data_pagamento || ato?.forma_pagamento
        ? [normalizePagamento({
            valor: ato.valor_pago,
            data_pagamento: ato.data_pagamento,
            forma_pagamento: ato.forma_pagamento,
          })]
        : [createBlankPagamento()]);

  const pagamentosSummary = summarizePagamentos(pagamentosIniciais);

  return ato ? {
    ...ato,
    data_ato: ato.data_ato?.slice(0, 10) || '',
    pagamentos: pagamentosIniciais,
    valor_pago: pagamentosSummary.valor_pago,
    data_pagamento: pagamentosSummary.data_pagamento,
    forma_pagamento: pagamentosSummary.forma_pagamento,
    status: calcStatus(
      toMoney(ato.total)
        || (toMoney(ato.emolumentos) + toMoney(ato.repasses) + toMoney(ato.issqn) + toMoney(ato.reembolso_tabeliao) + toMoney(ato.reembolso_escrevente)),
      pagamentosSummary.valor_pago
    ),
  } : {
    controle: '',
    livro: '',
    pagina: '',
    captador_id: null,
    executor_id: null,
    signatario_id: null,
    nome_tomador: '',
    emolumentos: 0,
    repasses: 0,
    issqn: 0,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    escrevente_reembolso_id: null,
    data_ato: '',
    pagamentos: [createBlankPagamento()],
    valor_pago: 0,
    data_pagamento: '',
    forma_pagamento: '',
    status: 'pendente',
    verificado_por: null,
    verificado_em: null,
    correcoes: [],
    notas: '',
    comissao_override: null,
  };
}

export default function ModalAto({ ato, onClose, onSave, escreventes, userRole, userId }) {
  const [form, setForm] = useState(() => buildInitialForm(ato));
  const [corrMsg, setCorrMsg] = useState('');
  const [showAjusteComissao, setShowAjusteComissao] = useState(false);

  const set = (k, v) => setForm((current) => ({ ...current, [k]: v }));
  const total = toMoney(form.emolumentos) + toMoney(form.repasses) + toMoney(form.issqn) + toMoney(form.reembolso_tabeliao) + toMoney(form.reembolso_escrevente);
  const comissoes = form.comissoes || [];
  const pagamentosValidos = (form.pagamentos || []).filter((pagamento) => toMoney(pagamento.valor) > 0);
  const statusCalculado = calcStatus(total, toMoney(form.valor_pago));

  const reembEsc = (() => {
    const reemEsc = toMoney(form.reembolso_escrevente);
    const vPago = toMoney(form.valor_pago);
    if (reemEsc <= 0 || vPago <= 0) return 0;
    const prior = toMoney(form.emolumentos) + toMoney(form.repasses) + toMoney(form.issqn) + toMoney(form.reembolso_tabeliao);
    const sobra = vPago - prior;
    return sobra > 0 ? Math.min(sobra, reemEsc) : 0;
  })();

  const podeEditar = userRole === 'admin' || userRole === 'financeiro' || userRole === 'chefe_financeiro';
  const podeVerCom = podeEditar || (ato && [ato.captador_id, ato.executor_id, ato.signatario_id].includes(userId));

  const syncPagamentos = (updater) => {
    setForm((current) => {
      const pagamentos = typeof updater === 'function' ? updater(current.pagamentos || []) : updater;
      const nextPagamentos = pagamentos.length ? pagamentos : [createBlankPagamento()];
      const summary = summarizePagamentos(nextPagamentos);

      return {
        ...current,
        pagamentos: nextPagamentos,
        valor_pago: summary.valor_pago,
        data_pagamento: summary.data_pagamento,
        forma_pagamento: summary.forma_pagamento,
        status: calcStatus(
          toMoney(current.emolumentos) + toMoney(current.repasses) + toMoney(current.issqn) + toMoney(current.reembolso_tabeliao) + toMoney(current.reembolso_escrevente),
          summary.valor_pago
        ),
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

  const confirmarRecebimento = () => {
    const nome = { admin: 'Tabelião', financeiro: 'Financeiro', chefe_financeiro: 'Chefe Financeiro' }[userRole] || userRole;
    setForm((current) => ({ ...current, verificado_por: nome, verificado_em: null }));
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
          </div>

          <div>
            <ST>👥 Escreventes Participantes</ST>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <FSel label="Captador (opcional)" options={escOpts} value={form.captador_id || ''} onChange={(e) => set('captador_id', e.target.value ? Number.parseInt(e.target.value, 10) : null)} disabled={!podeEditar} />
              <FSel label="Executor" options={escOpts} value={form.executor_id || ''} onChange={(e) => set('executor_id', e.target.value ? Number.parseInt(e.target.value, 10) : null)} disabled={!podeEditar} />
              <FSel label="Signatário" options={escOpts} value={form.signatario_id || ''} onChange={(e) => set('signatario_id', e.target.value ? Number.parseInt(e.target.value, 10) : null)} disabled={!podeEditar} />
            </div>
            {!form.captador_id && <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', fontSize: 12, color: '#64748b' }}>ℹ️ Sem captador indicado — nenhuma comissão será devida para este ato.</div>}
          </div>

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
              <CurrencyInput label="Reembolso Tabelião" value={form.reembolso_tabeliao} onChange={(v) => set('reembolso_tabeliao', v)} disabled={!podeEditar} />
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

          <div>
            <ST>🏦 Pagamentos do Ato</ST>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(form.pagamentos || []).map((pagamento, index) => {
                const pagamentoKey = pagamento.id || pagamento._tmp;

                return (
                  <div key={pagamentoKey} style={{ border: '1px solid #dbe4f0', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 13 }}>Pagamento {index + 1}</div>
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
                  </div>
                );
              })}
            </div>

            {podeEditar && (
              <div style={{ marginTop: 12 }}>
                <Btn variant="secondary" onClick={addPagamento}>+ Adicionar pagamento</Btn>
              </div>
            )}

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Resumo calculado</div>
                <div style={{ marginTop: 4, color: '#1e3a5f', fontWeight: 700 }}>{fmt(form.valor_pago)} recebidos em {pagamentosValidos.length} lançamento(s)</div>
                <div style={{ marginTop: 2, fontSize: 12, color: '#64748b' }}>
                  Última data: {form.data_pagamento || '—'} | Forma resumo: {form.forma_pagamento || '—'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: form.valor_pago < total ? '#fff7ed' : form.valor_pago > total ? '#eff6ff' : '#f0fdf4', border: `1px solid ${form.valor_pago < total ? '#fdba74' : form.valor_pago > total ? '#93c5fd' : '#86efac'}` }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Situação do pagamento</div>
                <div style={{ marginTop: 4, fontWeight: 700, color: form.valor_pago < total ? '#c2410c' : form.valor_pago > total ? '#1d4ed8' : '#15803d' }}>
                  {form.valor_pago < total ? `⚠️ A receber: ${fmt(total - form.valor_pago)}` : form.valor_pago > total ? `ℹ️ A maior: ${fmt(form.valor_pago - total)}` : '✅ Pagamento integral'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FSel
                label="Status calculado"
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
            </div>

            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: form.verificado_por ? '#f0fdf4' : '#fef2f2', border: `1px solid ${form.verificado_por ? '#86efac' : '#fecaca'}` }}>
              {form.verificado_por ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>Recebimento confirmado</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Por {form.verificado_por}{form.verificado_em ? ` em ${form.verificado_em}` : ' — data definida ao salvar'}</div>
                  </div>
                  {userRole === 'admin' && <Btn variant="secondary" onClick={() => setForm((current) => ({ ...current, verificado_por: null, verificado_em: null }))} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}>Desfazer</Btn>}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>Recebimento ainda não confirmado</span>
                  {podeEditar && <Btn variant="success" onClick={confirmarRecebimento} style={{ padding: '6px 14px', fontSize: 13 }}>✅ Confirmar Recebimento</Btn>}
                </div>
              )}
            </div>
          </div>

          {podeVerCom && (
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

          {ato && (
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
            {podeEditar && <Btn onClick={() => onSave(form)}>💾 Salvar</Btn>}
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
