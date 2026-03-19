import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Badge, Btn, Card, FSel, ST } from '../components/ui/index.jsx';
import { fmt, fmtDate, padControle } from '../utils/format.js';

const STATUS_META = {
  preview: { label: 'Preview', color: '#f59e0b' },
  importado: { label: 'Importado', color: '#22c55e' },
  importado_parcial: { label: 'Importado Parcial', color: '#3b82f6' },
  falha: { label: 'Falha', color: '#ef4444' },
  cancelado: { label: 'Cancelado', color: '#64748b' },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || 'Desconhecido', color: '#64748b' };
}

function CountCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function HintBox({ title, color, background, border, children }) {
  return (
    <div style={{ background, border: `1px solid ${border}`, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ color, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{title}</div>
      <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function ValidationAccordion({ title, color, borderColor, countLabel, items, emptyLabel }) {
  return (
    <details style={{ border: `1px solid ${borderColor}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          fontWeight: 800,
          color,
          background: `${borderColor}22`,
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>{countLabel}</span>
      </summary>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 13 }}>{emptyLabel}</div>
        )}
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '10px 12px',
              background: '#f8fafc',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
              {item.scope}
            </div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.45 }}>{item.message}</div>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function Importacoes({ refreshKey = 0, onImportSuccess, onErro }) {
  const [arquivo, setArquivo] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [importando, setImportando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [loteDetalhe, setLoteDetalhe] = useState(null);
  const [autoCriarEscreventes, setAutoCriarEscreventes] = useState(true);
  const [taxaNovosEscreventes, setTaxaNovosEscreventes] = useState('20');

  const mockAtivo = import.meta.env.VITE_USE_MOCK === 'true';

  const loadLotes = useCallback(async (preferredId = null) => {
    setLoadingLista(true);
    try {
      const data = await api.getImportacoes({ limit: 30 });
      setLotes(data);
      setSelectedLoteId((current) => {
        if (preferredId && data.some((item) => item.id === preferredId)) return preferredId;
        if (current && data.some((item) => item.id === current)) return current;
        return data[0]?.id || null;
      });
    } catch (error) {
      onErro?.(`Erro ao carregar importações: ${error.message}`);
    } finally {
      setLoadingLista(false);
    }
  }, [onErro]);

  const loadLoteDetalhe = useCallback(async (loteId) => {
    if (!loteId) {
      setLoteDetalhe(null);
      return;
    }

    setLoadingDetalhe(true);
    try {
      const data = await api.getImportacao(loteId, { limit: 500, offset: 0 });
      setLoteDetalhe(data);
    } catch (error) {
      onErro?.(`Erro ao carregar lote: ${error.message}`);
    } finally {
      setLoadingDetalhe(false);
    }
  }, [onErro]);

  useEffect(() => {
    loadLotes();
  }, [loadLotes, refreshKey]);

  useEffect(() => {
    loadLoteDetalhe(selectedLoteId);
  }, [loadLoteDetalhe, selectedLoteId]);

  const selectedLote = loteDetalhe?.lote || lotes.find((item) => item.id === selectedLoteId) || null;
  const summary = selectedLote?.summary || {};
  const importResult = summary.import_result || null;
  const fileWarnings = Array.isArray(summary.file_warnings) ? summary.file_warnings : [];
  const previewRows = loteDetalhe?.linhas || [];
  const previewErrorItems = useMemo(
    () => previewRows.flatMap((row) =>
      (Array.isArray(row.errors) ? row.errors : []).map((message, index) => ({
        key: `error-${row.id || row.numero_linha}-${index}-${message}`,
        scope: `Linha ${row.numero_linha}`,
        message,
      }))
    ),
    [previewRows]
  );
  const previewWarningItems = useMemo(
    () => [
      ...fileWarnings.map((message, index) => ({
        key: `file-warning-${index}-${message}`,
        scope: 'Arquivo',
        message,
      })),
      ...previewRows.flatMap((row) =>
        (Array.isArray(row.warnings) ? row.warnings : []).map((message, index) => ({
          key: `warning-${row.id || row.numero_linha}-${index}-${message}`,
          scope: `Linha ${row.numero_linha}`,
          message,
        }))
      ),
    ],
    [fileWarnings, previewRows]
  );
  const canImport = selectedLote?.status === 'preview' && (selectedLote?.linhas_validas || 0) > 0;
  const canCancel = selectedLote?.status === 'preview';
  const canDelete = Boolean(selectedLote);

  const counters = useMemo(() => [
    { label: 'Lotes', value: lotes.length, color: '#1e3a5f' },
    {
      label: 'Linhas válidas',
      value: selectedLote?.linhas_validas ?? '—',
      color: '#16a34a',
    },
    {
      label: 'Com erro',
      value: selectedLote?.linhas_com_erro ?? '—',
      color: '#ef4444',
    },
    {
      label: 'Com alerta',
      value: selectedLote?.linhas_com_alerta ?? '—',
      color: '#d97706',
    },
  ], [lotes.length, selectedLote]);

  const handlePreview = async () => {
    if (!arquivo) {
      onErro?.('Selecione uma planilha .xlsx antes de gerar o preview.');
      return;
    }

    setUploading(true);
    setMensagem('');
    try {
      const preview = await api.previewImportacao(arquivo);
      setMensagem(`Preview gerado para ${preview.arquivo_nome}. Lote #${preview.lote_id} criado com ${preview.summary.valid_rows} linhas válidas.`);
      setArquivo(null);
      setInputKey((value) => value + 1);
      await loadLotes(preview.lote_id);
      setSelectedLoteId(preview.lote_id);
    } catch (error) {
      onErro?.(`Erro ao gerar preview: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleImportar = async () => {
    if (!selectedLote) return;

    const confirmed = window.confirm(
      `Importar o lote #${selectedLote.id}? Esta operação vai gravar atos reais no banco.`
    );
    if (!confirmed) return;

    setImportando(true);
    setMensagem('');
    try {
      const result = await api.importarLote(selectedLote.id, {
        auto_criar_escreventes: autoCriarEscreventes,
        taxa_padrao_novos_escreventes: Number.parseInt(taxaNovosEscreventes, 10),
      });
      setMensagem(`Importação concluída: ${result.imported} linhas importadas e ${result.skipped} puladas.`);
      await Promise.all([
        loadLotes(selectedLote.id),
        loadLoteDetalhe(selectedLote.id),
        Promise.resolve(onImportSuccess?.()),
      ]);
    } catch (error) {
      onErro?.(`Erro ao importar lote: ${error.message}`);
    } finally {
      setImportando(false);
    }
  };

  const handleCancelar = async () => {
    if (!selectedLote) return;

    const confirmed = window.confirm(
      `Cancelar o lote #${selectedLote.id}? O preview continuará listado como cancelado e não poderá mais ser importado.`
    );
    if (!confirmed) return;

    setCancelando(true);
    setMensagem('');
    try {
      const result = await api.cancelarImportacao(selectedLote.id);
      setMensagem(
        result.alreadyCancelled
          ? `O lote #${selectedLote.id} já estava cancelado.`
          : `Lote #${selectedLote.id} cancelado.`
      );
      await Promise.all([
        loadLotes(selectedLote.id),
        loadLoteDetalhe(selectedLote.id),
      ]);
    } catch (error) {
      onErro?.(`Erro ao cancelar lote: ${error.message}`);
    } finally {
      setCancelando(false);
    }
  };

  const handleDeletar = async () => {
    if (!selectedLote) return;

    const importedCount = Number.parseInt(importResult?.imported || 0, 10) || 0;
    const deletedScope =
      importedCount > 0
        ? `Isto vai excluir o lote #${selectedLote.id} e remover ${importedCount} ato(s) importado(s) deste lote.`
        : `Isto vai excluir definitivamente o lote #${selectedLote.id}.`;

    const confirmed = window.confirm(`${deletedScope} Deseja continuar?`);
    if (!confirmed) return;

    setDeletando(true);
    setMensagem('');
    try {
      const result = await api.deletarImportacao(selectedLote.id);
      const removedEscreventes = Array.isArray(result.deleted_created_escreventes)
        ? result.deleted_created_escreventes.length
        : 0;
      const preservedEscreventes = Array.isArray(result.skipped_created_escreventes)
        ? result.skipped_created_escreventes.length
        : 0;

      setMensagem(
        `Lote #${selectedLote.id} excluído. `
        + `${result.deleted_imported_atos || 0} ato(s) removido(s), `
        + `${removedEscreventes} escrevente(s) auto-criado(s) removido(s)`
        + (preservedEscreventes > 0 ? ` e ${preservedEscreventes} preservado(s) por ainda terem referência.` : '.')
      );

      await loadLotes();
      if ((result.deleted_imported_atos || 0) > 0 || removedEscreventes > 0) {
        await Promise.resolve(onImportSuccess?.());
      }
    } catch (error) {
      onErro?.(`Erro ao excluir lote: ${error.message}`);
    } finally {
      setDeletando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {mockAtivo && (
        <HintBox
          title="Modo mock ativo"
          color="#92400e"
          background="#fffbeb"
          border="#fde68a"
        >
          O preview e a importação de planilhas dependem do backend real. Nesta tela, o modo mock só serve para navegação visual.
        </HintBox>
      )}

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 760 }}>
            <ST>Upload de planilha</ST>
            <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
              Use esta tela para subir a planilha de controle diário, gerar o preview de validação e só então importar os atos.
              Nesta rodada, <strong>ESCREVENTE da planilha é tratado como captador</strong>. Executor e signatário seguem em aberto.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                Arquivo .xlsx
              </label>
              <input
                key={inputKey}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setArquivo(event.target.files?.[0] || null)}
                style={{ fontSize: 13, color: '#334155' }}
              />
            </div>
            <Btn onClick={handlePreview} disabled={uploading || !arquivo} style={{ minWidth: 170 }}>
              {uploading ? 'Enviando...' : 'Gerar Preview'}
            </Btn>
          </div>
        </div>
        {arquivo && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#1e3a5f', fontWeight: 600 }}>
            Arquivo selecionado: {arquivo.name}
          </div>
        )}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'end' }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoCriarEscreventes}
              onChange={(event) => setAutoCriarEscreventes(event.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: '#1e293b', fontSize: 13, fontWeight: 700 }}>
                Criar escreventes faltantes automaticamente
              </span>
              <span style={{ color: '#64748b', fontSize: 12 }}>
                Use isto para carga inicial em sistema vazio. Os escreventes novos entram ativos, sem e-mail e sem cargo.
              </span>
            </span>
          </label>
          <FSel
            label="Taxa padrão dos novos escreventes"
            value={taxaNovosEscreventes}
            onChange={(event) => setTaxaNovosEscreventes(event.target.value)}
            disabled={!autoCriarEscreventes}
            options={[
              { value: '6', label: '6%' },
              { value: '20', label: '20%' },
              { value: '30', label: '30%' },
            ]}
          />
        </div>
        {mensagem && (
          <div style={{ marginTop: 14, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
            {mensagem}
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {counters.map((item) => (
          <CountCard key={item.label} label={item.label} value={item.value} color={item.color} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <ST>Lotes recentes</ST>
            {loadingLista && <span style={{ color: '#64748b', fontSize: 12 }}>Carregando...</span>}
          </div>

          {lotes.length === 0 && !loadingLista && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum lote enviado ainda.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lotes.map((lote) => {
              const meta = statusMeta(lote.status);
              return (
                <button
                  key={lote.id}
                  onClick={() => setSelectedLoteId(lote.id)}
                  style={{
                    textAlign: 'left',
                    border: selectedLoteId === lote.id ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                    background: selectedLoteId === lote.id ? '#eff6ff' : '#fff',
                    borderRadius: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1e3a5f' }}>Lote #{lote.id}</div>
                    <Badge label={meta.label} color={meta.color} />
                  </div>
                  <div style={{ marginTop: 8, color: '#334155', fontSize: 13, fontWeight: 600, wordBreak: 'break-word' }}>
                    {lote.arquivo_nome}
                  </div>
                  <div style={{ marginTop: 6, color: '#64748b', fontSize: 12 }}>
                    {lote.sheet_name} • {lote.total_linhas} linhas • {fmtDate(String(lote.created_at).slice(0, 10))}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>{lote.linhas_validas} válidas</span>
                    <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{lote.linhas_com_erro} com erro</span>
                    <span style={{ fontSize: 12, color: '#d97706', fontWeight: 700 }}>{lote.linhas_com_alerta} com alerta</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          {!selectedLote && !loadingDetalhe && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Selecione um lote para ver o preview detalhado.</div>
          )}

          {selectedLote && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <ST>Detalhe do lote #{selectedLote.id}</ST>
                  <div style={{ color: '#334155', fontSize: 14, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>
                    {selectedLote.arquivo_nome}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    Aba: {selectedLote.sheet_name || '—'} • Enviado por: {selectedLote.uploaded_by_nome || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge label={statusMeta(selectedLote.status).label} color={statusMeta(selectedLote.status).color} />
                  {canCancel && (
                    <Btn
                      variant="warning"
                      onClick={handleCancelar}
                      disabled={cancelando || importando || deletando}
                    >
                      {cancelando ? 'Cancelando...' : 'Cancelar Lote'}
                    </Btn>
                  )}
                  {selectedLote.status === 'preview' && (
                    <Btn
                      variant="success"
                      onClick={handleImportar}
                      disabled={!canImport || importando || cancelando || deletando}
                    >
                      {importando ? 'Importando...' : 'Importar Lote'}
                    </Btn>
                  )}
                  {canDelete && selectedLote.status !== 'preview' && (
                    <Btn
                      variant="danger"
                      onClick={handleDeletar}
                      disabled={deletando || importando || cancelando}
                    >
                      {deletando ? 'Excluindo...' : 'Excluir Lote'}
                    </Btn>
                  )}
                </div>
              </div>

              {loadingDetalhe && <div style={{ color: '#64748b', fontSize: 13 }}>Carregando preview detalhado...</div>}

              {importResult && (
                <HintBox
                  title="Resultado da importação"
                  color={importResult.imported > 0 ? '#1d4ed8' : '#b91c1c'}
                  background={importResult.imported > 0 ? '#eff6ff' : '#fef2f2'}
                  border={importResult.imported > 0 ? '#bfdbfe' : '#fecaca'}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div><strong>Importadas:</strong> {importResult.imported}</div>
                    <div><strong>Puladas:</strong> {importResult.skipped}</div>
                    <div><strong>Quando:</strong> {fmtDate(String(importResult.imported_at || '').slice(0, 10))}</div>
                  </div>
                  {Array.isArray(importResult.created_escreventes) && importResult.created_escreventes.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <strong>Escreventes criados automaticamente:</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        {importResult.created_escreventes.map((item) => (
                          <li key={`${item.id}-${item.nome}`}>
                            {item.nome} ({item.taxa}%)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(importResult.assumptions) && importResult.assumptions.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <strong>Premissas:</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        {importResult.assumptions.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <strong>Primeiros erros:</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        {importResult.errors.slice(0, 10).map((item) => (
                          <li key={`${item.numero_linha}-${item.motivos?.join('|') || 'erro'}`}>
                            Linha {item.numero_linha}: {(item.motivos || []).join('; ')}
                          </li>
                        ))}
                      </ul>
                      {importResult.errors.length > 10 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                          Exibindo 10 de {importResult.errors.length} erros.
                        </div>
                      )}
                    </div>
                  )}
                  {Array.isArray(importResult.created_escreventes) && importResult.created_escreventes.length > 0 && selectedLote.status !== 'preview' && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>
                      Ao excluir este lote, o sistema tenta remover automaticamente esses escreventes se eles continuarem sem outras referências.
                    </div>
                  )}
                </HintBox>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <CountCard label="Total linhas" value={selectedLote.total_linhas} color="#1e3a5f" />
                <CountCard label="Válidas" value={selectedLote.linhas_validas} color="#16a34a" />
                <CountCard label="Erros" value={selectedLote.linhas_com_erro} color="#ef4444" />
                <CountCard label="Alertas" value={selectedLote.linhas_com_alerta} color="#d97706" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <ValidationAccordion
                  title="Erros detalhados do preview"
                  color="#b91c1c"
                  borderColor="#fecaca"
                  countLabel={`${previewErrorItems.length} ocorrência(s)`}
                  items={previewErrorItems}
                  emptyLabel="Nenhum erro encontrado neste lote."
                />
                <ValidationAccordion
                  title="Alertas detalhados do preview"
                  color="#92400e"
                  borderColor="#fde68a"
                  countLabel={`${selectedLote.linhas_com_alerta || 0} linha(s) com alerta${fileWarnings.length ? ` • ${fileWarnings.length} alerta(s) de arquivo` : ''}`}
                  items={previewWarningItems}
                  emptyLabel="Nenhum alerta encontrado neste lote."
                />
              </div>

              <div>
                <ST>Linhas do preview</ST>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 10 }}>
                  Exibindo {previewRows.length} linha(s) persistidas em staging. Os dados só entram em <code>atos</code> após clicar em importar.
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Linha', 'Controle', 'Referência', 'Data', 'Ato', 'Escrevente', 'Emolumentos', 'Forma PG', 'Validação'].map((header) => (
                          <th key={header} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => {
                        const normalized = row.normalized_data || {};
                        const errors = Array.isArray(row.errors) ? row.errors : [];
                        const warnings = Array.isArray(row.warnings) ? row.warnings : [];
                        const controle = normalized.controle ? padControle(normalized.controle) : '—';
                        const emolumentos = normalized.emolumentos == null ? '—' : fmt(normalized.emolumentos);
                        return (
                          <tr key={row.id || row.numero_linha} style={{ borderTop: '1px solid #e2e8f0', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                            <td style={{ padding: '11px 14px', color: '#64748b', fontWeight: 700 }}>{row.numero_linha}</td>
                            <td style={{ padding: '11px 14px', color: '#1e3a5f', fontWeight: 700 }}>{controle}</td>
                            <td style={{ padding: '11px 14px', color: '#64748b' }}>
                              {normalized.livro && normalized.pagina ? `L${String(normalized.livro).padStart(5, '0')}P${String(normalized.pagina).padStart(3, '0')}` : '—'}
                            </td>
                            <td style={{ padding: '11px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(normalized.data_ato)}</td>
                            <td style={{ padding: '11px 14px', fontWeight: 600 }}>{normalized.tipo_ato || '—'}</td>
                            <td style={{ padding: '11px 14px' }}>{normalized.escrevente_nome || '—'}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontWeight: 700 }}>{emolumentos}</td>
                            <td style={{ padding: '11px 14px' }}>{normalized.forma_pagamento || '—'}</td>
                            <td style={{ padding: '11px 14px', minWidth: 280 }}>
                              {errors.length === 0 && warnings.length === 0 && (
                                <span style={{ color: '#16a34a', fontWeight: 700 }}>Linha válida</span>
                              )}
                              {errors.length > 0 && (
                                <div style={{ color: '#dc2626', fontWeight: 700 }}>
                                  {errors.map((item) => <div key={item}>Erro: {item}</div>)}
                                </div>
                              )}
                              {warnings.length > 0 && (
                                <div style={{ color: '#92400e', marginTop: errors.length > 0 ? 6 : 0 }}>
                                  {warnings.map((item) => <div key={item}>Alerta: {item}</div>)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {previewRows.length === 0 && !loadingDetalhe && (
                  <div style={{ paddingTop: 14, color: '#94a3b8', fontSize: 13 }}>Nenhuma linha disponível para este lote.</div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
