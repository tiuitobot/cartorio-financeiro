import { Card, Btn, FInput, Badge } from '../components/ui/index.jsx';
import { padControle, fmtRef, fmtDate, fmt, sLabel, sColor } from '../utils/format.js';

export default function Atos({
  atos, escreventes, reivindicacoes, userRole, userId,
  onOpenAto, onDeclaro, onRespostaCaptador, onContestar, onDecisaoFinanceiro,
  busca, onBusca,
}) {
  const reivRecusadas   = reivindicacoes.filter(r => r.escrevente_id === userId && r.status === 'recusada');
  const reivPendentes   = reivindicacoes.filter(r => r.status === 'pendente' && atos.find(a => a.id === r.ato_id && a.captador_id === userId));
  const reivContestadas = reivindicacoes.filter(r => r.status === 'contestada');

  return (
    <div>
      {/* Painel: reivindicações recusadas (escrevente) */}
      {userRole === 'escrevente' && reivRecusadas.length > 0 && (
        <Card style={{ marginBottom: 18, borderLeft: '4px solid #ef4444', background: '#fef2f2' }}>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>⚠️ Reivindicação Recusada pelo Captador</div>
          {reivRecusadas.map(r => {
            const ato = atos.find(a => a.id === r.ato_id);
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #fecaca', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Ato {padControle(ato?.controle || '')} — {r.funcao === 'executor' ? 'Executor' : 'Signatário'}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Justificativa: <em>{r.justificativa}</em></div>
                </div>
                <Btn variant="warning" onClick={() => onContestar(r.id)} style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}>Contestar</Btn>
              </div>
            );
          })}
        </Card>
      )}

      {/* Painel: reivindicações aguardando resposta do captador */}
      {userRole === 'escrevente' && reivPendentes.length > 0 && (
        <Card style={{ marginBottom: 18, borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
          <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 10 }}>🔔 Reivindicações Aguardando Sua Resposta</div>
          {reivPendentes.map(r => {
            const ato = atos.find(a => a.id === r.ato_id);
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.escrevente_nome} — {r.funcao === 'executor' ? 'Executor' : 'Signatário'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Ato {padControle(ato?.controle || '')} — {fmtRef(ato?.livro, ato?.pagina)}</div>
                </div>
                <Btn variant="warning" onClick={() => onRespostaCaptador(r)} style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}>Responder</Btn>
              </div>
            );
          })}
        </Card>
      )}

      {/* Painel: contestações aguardando decisão financeiro/admin */}
      {['financeiro', 'chefe_financeiro', 'admin'].includes(userRole) && reivContestadas.length > 0 && (
        <Card style={{ marginBottom: 18, borderLeft: '4px solid #3b82f6', background: '#eff6ff' }}>
          <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>⚖️ Contestações Aguardando Decisão ({reivContestadas.length})</div>
          {reivContestadas.map(r => {
            const ato      = atos.find(a => a.id === r.ato_id);
            const captador = escreventes.find(e => e.id === ato?.captador_id);
            return (
              <div key={r.id} style={{ padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #bfdbfe', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.escrevente_nome} — {r.funcao === 'executor' ? 'Executor' : 'Signatário'} | Ato {padControle(ato?.controle || '')} | Captador: {captador?.nome || '—'}</div>
                <div style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 10px' }}>Recusa: <em>{r.justificativa}</em></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="success" onClick={() => onDecisaoFinanceiro(r.id, true)}  style={{ fontSize: 12, padding: '6px 14px' }}>✅ Aceitar</Btn>
                  <Btn variant="danger"  onClick={() => onDecisaoFinanceiro(r.id, false)} style={{ fontSize: 12, padding: '6px 14px' }}>❌ Negar</Btn>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Busca */}
      <div style={{ marginBottom: 18, display: 'flex', gap: 10 }}>
        <FInput placeholder="Controle ou L42P15..." value={busca} onChange={e => onBusca(e.target.value)} style={{ width: 280 }} />
        {busca && <Btn variant="secondary" onClick={() => onBusca('')} style={{ padding: '9px 12px', fontSize: 12 }}>✕</Btn>}
      </div>

      {/* Tabela */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Controle', 'Referência', 'Data', 'Captador', 'Emolumentos', 'Total', 'Pago', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atos.map((a, i) => {
                const capt = escreventes.find(e => e.id === a.captador_id);
                const tot  = a.total;
                return (
                  <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}
                    onMouseOver={ev => ev.currentTarget.style.background = '#f0f7ff'}
                    onMouseOut={ev  => ev.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap' }}>{padControle(a.controle)}</td>
                    <td style={{ padding: '11px 14px', color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{fmtRef(a.livro, a.pagina)}</td>
                    <td style={{ padding: '11px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(a.data_ato)}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{capt?.nome || <span style={{ color: '#94a3b8', fontSize: 12 }}>Sem captador</span>}</td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>{fmt(a.emolumentos)}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(tot)}</td>
                    <td style={{ padding: '11px 14px', color: a.valor_pago >= tot ? '#22c55e' : '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(a.valor_pago)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Badge label={sLabel(a.status)} color={sColor(a.status)} />
                        {a.verificado_por && <span title={`Confirmado por ${a.verificado_por}`} style={{ fontSize: 14 }}>✅</span>}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <Btn variant="secondary" onClick={() => onOpenAto(a)} style={{ padding: '5px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>🔍 Ver/Editar</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {atos.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum ato encontrado.</div>}
      </Card>
    </div>
  );
}
