export function buildOpenReembolsoContestacoes({ pendencias = [], pagamentosReembolso = [], escreventes = [] }) {
  const pagamentosById = new Map(
    pagamentosReembolso
      .filter((item) => item?.id != null)
      .map((item) => [Number(item.id), item])
  );
  const escreventesById = new Map(
    escreventes
      .filter((item) => item?.id != null)
      .map((item) => [Number(item.id), item])
  );

  return pendencias
    .filter((item) => (
      item
      && item.solucionado !== true
      && item.visivel !== false
      && item.metadata?.reembolso_id
    ))
    .map((item) => {
      const reembolsoId = Number(item.metadata.reembolso_id);
      const pagamento = pagamentosById.get(reembolsoId) || null;
      const escreventeId = pagamento?.escrevente_id ?? item.escrevente_id ?? null;
      const escrevente = escreventesById.get(Number(escreventeId)) || null;

      return {
        id: item.id,
        reembolso_id: reembolsoId,
        justificativa: item.metadata?.contestacao_justificativa || item.descricao || '',
        criado_em: item.criado_em || null,
        pendencia: item,
        pagamento,
        escrevente,
      };
    })
    .sort((a, b) => (
      String(b.pagamento?.contestado_em || b.criado_em || '').localeCompare(String(a.pagamento?.contestado_em || a.criado_em || ''))
    ));
}
