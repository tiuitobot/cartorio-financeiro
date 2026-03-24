import { useMemo, useState } from 'react';
import { Btn, FilterChip, Sheet } from '../components/ui/index.jsx';
import { fmt, sLabel, sColor } from '../utils/format.js';

export default function Dashboard({ atos, escreventes, contestacoesReembolsoAbertas = [], onOpenContestacoesReembolso }) {
  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = useMemo(() => {
    const years = new Set([anoAtual]);
    atos.forEach((ato) => {
      if (ato.data_ato) years.add(Number.parseInt(ato.data_ato.slice(0, 4), 10));
    });
    return [...years].filter(Boolean).sort((a, b) => b - a);
  }, [anoAtual, atos]);
  const [anoSelecionado, setAnoSelecionado] = useState(String(anoAtual));

  const atosAno = useMemo(
    () => atos.filter((ato) => ato.data_ato?.startsWith(`${anoSelecionado}-`)),
    [anoSelecionado, atos]
  );

  const totalFaturado = atosAno.reduce((s, a) => s + a.total, 0);
  const totalRecebido = atosAno.reduce((s, a) => s + Math.min(a.valor_pago, a.total), 0);
  const totalPendente = atosAno.reduce((s, a) => s + Math.max(0, a.total - a.valor_pago), 0);

  const meses = [...new Set(atosAno.map((ato) => ato.data_ato?.slice(0, 7)).filter(Boolean))].sort();
  const ultimoMes = meses[meses.length - 2];
  const saldoHistorico = ultimoMes
    ? atosAno.filter((ato) => ato.data_ato?.startsWith(ultimoMes) || ato.data_ato < ultimoMes)
      .reduce((sum, ato) => sum + Math.max(0, ato.total - ato.valor_pago), 0)
    : 0;
  const saldoAtualDessesAtos = ultimoMes
    ? atosAno.filter((ato) => ato.data_ato < `${ultimoMes}-32`)
      .reduce((sum, ato) => sum + Math.max(0, ato.total - ato.valor_pago), 0)
    : 0;

  const topCobradores = escreventes
    .map((escrevente) => {
      const atosEscrevente = atosAno.filter((ato) =>
        ato.captador_id === escrevente.id
        && ato.status === 'pago'
        && ato.data_pagamento
        && ato.data_ato
      );
      if (!atosEscrevente.length) return null;

      const media = atosEscrevente.reduce((sum, ato) => {
        const diff = new Date(ato.data_pagamento) - new Date(ato.data_ato);
        return sum + diff;
      }, 0) / atosEscrevente.length;

      return {
        nome: escrevente.nome,
        mediaDias: Math.round(media / 86400000),
        qtd: atosEscrevente.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.mediaDias - b.mediaDias)
    .slice(0, 5);

  const totalEmolumentos = atosAno.reduce((s, a) => s + a.emolumentos, 0);
  const emolAReceber = atosAno
    .filter((ato) => ato.status === 'pendente' || ato.status === 'pago_menor')
    .reduce((sum, ato) => sum + Math.max(0, ato.emolumentos - (ato.valor_pago > 0 ? Math.min(ato.emolumentos, ato.valor_pago) : 0)), 0);
  const totalRepassesISSQN = atosAno.reduce((s, a) => s + a.repasses + a.issqn, 0);

  const metrics = [
    { l: 'Total Faturado', v: fmt(totalFaturado), i: '📋', c: '#1e3a5f', bg: '#eff6ff' },
    { l: 'Total Recebido', v: fmt(totalRecebido), i: '✅', c: '#16a34a', bg: '#f0fdf4' },
    { l: 'Saldo a Receber', v: fmt(totalPendente), i: '⏳', c: '#dc2626', bg: '#fef2f2' },
    { l: 'Total Emolumentos', v: fmt(totalEmolumentos), i: '⚖️', c: '#7c3aed', bg: '#f5f3ff' },
    { l: 'Emolumentos a Receber', v: fmt(emolAReceber), i: '💰', c: '#9333ea', bg: '#fdf4ff' },
    { l: 'Total Repasses + ISSQN', v: fmt(totalRepassesISSQN), i: '🔁', c: '#d97706', bg: '#fffbeb' },
  ];
  const porStatus = ['pago', 'pendente', 'pago_menor', 'pago_maior']
    .map((status) => ({ l: sLabel(status), n: atosAno.filter((ato) => ato.status === status).length, c: sColor(status) }));
  const maiorStatus = Math.max(...porStatus.map((item) => item.n), 1);
  const topCapt = escreventes
    .map((escrevente) => ({
      nome: escrevente.nome,
      total: atosAno.filter((ato) => ato.captador_id === escrevente.id).reduce((sum, ato) => sum + ato.emolumentos, 0),
      qtd: atosAno.filter((ato) => ato.captador_id === escrevente.id).length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const dadosMensais = useMemo(() => (
    Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0');
      const chave = `${anoSelecionado}-${month}`;
      const atosMes = atosAno.filter((ato) => ato.data_ato?.startsWith(chave));
      const faturado = atosMes.reduce((sum, ato) => sum + ato.total, 0);
      const recebido = atosMes.reduce((sum, ato) => sum + Math.min(ato.total, ato.valor_pago), 0);
      return {
        mes: new Date(Number.parseInt(anoSelecionado, 10), index, 1).toLocaleDateString('pt-BR', { month: 'short' }),
        faturado,
        recebido,
        pendente: Math.max(0, faturado - recebido),
      };
    })
  ), [anoSelecionado, atosAno]);
  const maiorBarra = Math.max(...dadosMensais.map((item) => item.faturado), 1);
  const [showAnoSheet, setShowAnoSheet] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'linear-gradient(180deg,#ffffff,#f8fbff)', borderRadius: 14, padding: 18, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>Visão do Dashboard</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Ano ativo em destaque, com troca em sheet para manter o topo leve e compatível com mobile.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <FilterChip active>{anoSelecionado}</FilterChip>
            <Btn variant="secondary" onClick={() => setShowAnoSheet(true)} style={{ padding: '9px 12px', fontSize: 12 }}>
              Escolher ano
            </Btn>
          </div>
        </div>
      </div>

      {contestacoesReembolsoAbertas.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#fff7ed,#ffffff)', borderRadius: 14, padding: 20, border: '1px solid #fed7aa', boxShadow: '0 2px 16px #7c2d120f' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.8 }}>Alerta Financeiro</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#7c2d12', marginTop: 4 }}>
                {contestacoesReembolsoAbertas.length} contestação(ões) de reembolso aguardando análise
              </div>
              <div style={{ fontSize: 13, color: '#9a3412', marginTop: 6, maxWidth: 760 }}>
                O escrevente já sinalizou divergência. O financeiro pode tratar isso direto em Relatórios &gt; Reembolsos, sem depender de busca manual.
              </div>
            </div>
            <Btn onClick={onOpenContestacoesReembolso} style={{ padding: '9px 14px', fontSize: 13 }}>
              Abrir Reembolsos
            </Btn>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {contestacoesReembolsoAbertas.slice(0, 3).map((item) => (
              <div key={item.id} style={{ display: 'grid', gap: 4, padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid #fed7aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, color: '#7c2d12' }}>{item.escrevente?.nome || 'Escrevente'}</div>
                  <div style={{ fontSize: 12, color: '#9a3412' }}>{item.pagamento?.data || item.criado_em?.slice(0, 10) || 'Data não informada'}</div>
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  Valor contestado: <strong>{fmt(item.pagamento?.valor || 0)}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  Justificativa: <em>{item.justificativa}</em>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet
        open={showAnoSheet}
        title="Ano do dashboard"
        subtitle="Troque a visão anual sem ocupar o topo com selects permanentes."
        onClose={() => setShowAnoSheet(false)}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setShowAnoSheet(false)} style={{ padding: '8px 12px', fontSize: 12 }}>
              Fechar
            </Btn>
          </div>
        )}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {anosDisponiveis.map((ano) => (
            <FilterChip
              key={ano}
              active={anoSelecionado === String(ano)}
              onClick={() => {
                setAnoSelecionado(String(ano));
                setShowAnoSheet(false);
              }}
            >
              {ano}
            </FilterChip>
          ))}
        </div>
      </Sheet>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: m.bg, borderRadius: 14, padding: '18px 22px', border: `1.5px solid ${m.c}22`, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>{m.i}</span>
            <div><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{m.l}</div><div style={{ fontSize: 20, fontWeight: 800, color: m.c, marginTop: 2 }}>{m.v}</div></div>
          </div>
        ))}
      </div>

      {ultimoMes && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 12, fontSize: 15 }}>📆 Situação Histórica — {ultimoMes}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Saldo em aberto em {ultimoMes}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{fmt(saldoHistorico)}</div>
            </div>
            <div style={{ background: saldoAtualDessesAtos > 0 ? '#fff7ed' : '#f0fdf4', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Saldo atual (créditos até {ultimoMes})</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: saldoAtualDessesAtos > 0 ? '#d97706' : '#16a34a' }}>{fmt(saldoAtualDessesAtos)}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
        <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontSize: 15 }}>📆 Faturado x Recebido x Pendente por Mês</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 12, alignItems: 'end', minHeight: 220 }}>
          {dadosMensais.map((item) => {
            const totalHeight = item.faturado > 0 ? Math.max(14, (item.faturado / maiorBarra) * 160) : 8;
            const recebidoHeight = item.faturado > 0 ? Math.max(0, (item.recebido / item.faturado) * totalHeight) : 0;
            const pendenteHeight = Math.max(0, totalHeight - recebidoHeight);
            return (
              <div key={item.mes} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{fmt(item.faturado)}</div>
                <div style={{ height: 168, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: 34, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', minHeight: 8 }}>
                    <div style={{ height: recebidoHeight, background: '#22c55e' }} />
                    <div style={{ height: pendenteHeight, background: '#ef4444' }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'capitalize' }}>{item.mes}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Recebido</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Pendente</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontSize: 15 }}>📊 Atos por Status</div>
          {porStatus.map((status, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: status.c }} /><span style={{ fontSize: 14 }}>{status.l}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, justifyContent: 'flex-end' }}>
                <div style={{ width: 140, height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${status.n > 0 ? Math.max(6, (status.n / maiorStatus) * 100) : 0}%`, background: status.c, borderRadius: 999, opacity: 0.8 }} />
                </div>
                <span style={{ fontWeight: 700, color: status.c, minWidth: 24, textAlign: 'right' }}>{status.n}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontSize: 15 }}>🏆 Top Captadores</div>
          {topCapt.map((escrevente, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '6px 10px', background: index === 0 ? '#f0f7ff' : '#fafbfc', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{index + 1}</span>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{escrevente.nome}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{escrevente.qtd} atos</div></div>
              </div>
              <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 13 }}>{fmt(escrevente.total)}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontSize: 15 }}>⚡ Top Cobradores (tempo médio)</div>
          {topCobradores.length === 0
            ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Dados insuficientes.</div>
            : topCobradores.map((escrevente, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '6px 10px', background: index === 0 ? '#f0fdf4' : '#fafbfc', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{index + 1}</span>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{escrevente.nome}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{escrevente.qtd} atos pagos</div></div>
                </div>
                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{escrevente.mediaDias}d</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
