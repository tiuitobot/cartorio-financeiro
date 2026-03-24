import { useMemo, useState } from 'react';
import ModalDespesaRegistro from '../components/modals/ModalDespesaRegistro.jsx';
import { Badge, Btn, Card, FInput, StickyXScroll } from '../components/ui/index.jsx';
import { fmt, fmtDate, padControle } from '../utils/format.js';

function CountCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function buildImpactBadge(item) {
  const statusLabel = ({
    pago: 'Pago',
    pago_menor: 'Pago a menor',
    pago_maior: 'Pago a maior',
  })[item.ato_vinculado_status] || item.ato_vinculado_status;

  switch (item.impacto_financeiro) {
    case 'apos_pagamento_sem_recalculo':
      return {
        label: 'Após pagamento',
        color: '#f59e0b',
        detail: `Status do ato mantido${statusLabel ? `: ${statusLabel}` : ''}.`,
      };
    case 'antes_do_pagamento':
      return {
        label: 'Antes do pagamento',
        color: '#2563eb',
        detail: 'Despesa segue isolada em Registro.',
      };
    case 'ato_sem_pagamento':
      return {
        label: 'Ato sem pagamento',
        color: '#64748b',
        detail: 'Sem reabertura de status financeiro.',
      };
    default:
      return {
        label: 'Sem ato',
        color: '#94a3b8',
        detail: 'Lançamento isolado no subdomínio de registro.',
      };
  }
}

export default function DespesasRegistro({ despesas = [], atos = [], onCreate, onUpdate, onDelete }) {
  const [busca, setBusca] = useState('');
  const [modalItem, setModalItem] = useState(null);
  const [mensagem, setMensagem] = useState('');

  const atosByControle = useMemo(
    () => new Map(atos.map((ato) => [padControle(ato.controle), ato])),
    [atos]
  );

  const despesasFiltradas = useMemo(() => {
    const search = String(busca || '').trim().toLowerCase();
    if (!search) return despesas;

    return despesas.filter((item) => {
      const haystack = [
        item.controle_ref,
        item.descricao,
        item.cartorio_nome,
        item.protocolo,
        item.observacoes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [busca, despesas]);

  const totalValor = useMemo(
    () => despesas.reduce((sum, item) => sum + Number(item.valor || 0), 0),
    [despesas]
  );

  const controlsComAto = useMemo(
    () => despesas.filter((item) => (
      Boolean(item.ato_vinculado_id || item.ato_vinculado_livro || item.ato_vinculado_pagina)
      || atosByControle.has(padControle(item.controle_ref))
    )).length,
    [atosByControle, despesas]
  );
  const despesasAposPagamento = useMemo(
    () => despesas.filter((item) => item.despesa_apos_pagamento).length,
    [despesas]
  );

  const handleSave = async (payload) => {
    if (modalItem?.id) {
      await onUpdate?.(modalItem.id, payload);
      setMensagem('Despesa de registro atualizada.');
    } else {
      await onCreate?.(payload);
      setMensagem('Despesa de registro criada.');
    }
    setModalItem(null);
  };

  const handleDelete = async (id) => {
    await onDelete?.(id);
    setMensagem('Despesa de registro excluída.');
    setModalItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <CountCard label="Lançamentos" value={despesas.length} color="#1e3a5f" />
        <CountCard label="Valor Total" value={fmt(totalValor)} color="#dc2626" />
        <CountCard label="Controles com ato" value={controlsComAto} color="#16a34a" />
        <CountCard label="Após pagamento" value={despesasAposPagamento} color="#d97706" />
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>🧾 Despesas de Registro</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              Subdomínio próprio para custos de registro. Despesas lançadas após o pagamento continuam fora do cálculo e não reabrem o status do ato.
            </div>
          </div>
          <Btn onClick={() => { setMensagem(''); setModalItem({}); }}>＋ Nova Despesa</Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 420px)', gap: 12, marginBottom: 16 }}>
          <FInput label="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Controle, cartório, protocolo, descrição..." />
        </div>

        {mensagem && <div style={{ marginBottom: 12, color: '#166534', fontSize: 13, fontWeight: 600 }}>{mensagem}</div>}

        {despesasFiltradas.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Nenhuma despesa de registro lançada.</div>
        ) : (
          <StickyXScroll>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1260 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Data', 'Controle', 'Descrição', 'Cartório', 'Valor', 'Protocolo', 'Ato', 'Impacto', ''].map((header) => (
                    <th key={header} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {despesasFiltradas.map((item, index) => {
                  const rowMatchedAto = atosByControle.get(padControle(item.controle_ref)) || null;
                  const impact = buildImpactBadge(item);
                  return (
                    <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={{ padding: '10px 14px' }}>{fmtDate(item.data_registro)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e3a5f' }}>{padControle(item.controle_ref)}</td>
                      <td style={{ padding: '10px 14px' }}>{item.descricao}</td>
                      <td style={{ padding: '10px 14px' }}>{item.cartorio_nome || '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#dc2626' }}>{fmt(item.valor)}</td>
                      <td style={{ padding: '10px 14px' }}>{item.protocolo || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {(item.ato_vinculado_livro && item.ato_vinculado_pagina)
                          ? <Badge label={`${item.ato_vinculado_livro}/${item.ato_vinculado_pagina}`} color="#16a34a" />
                          : rowMatchedAto
                          ? <Badge label={`${rowMatchedAto.livro}/${rowMatchedAto.pagina}`} color="#16a34a" />
                          : <Badge label="Sem ato" color="#94a3b8" />}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <Badge label={impact.label} color={impact.color} />
                          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{impact.detail}</div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Btn variant="secondary" onClick={() => { setMensagem(''); setModalItem(item); }} style={{ fontSize: 12, padding: '5px 12px' }}>
                          ✏️ Editar
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </StickyXScroll>
        )}
      </Card>

      {modalItem && (
        <ModalDespesaRegistro
          initialData={modalItem.id ? modalItem : null}
          atos={atos}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
