import { fmtLivro, fmtPagina, padControle, parseRef, sLabel } from './format.js';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildAtoSearchHaystack(ato, escreventesById) {
  const names = [ato.captador_id, ato.executor_id, ato.signatario_id]
    .map((id) => escreventesById.get(id)?.nome || '')
    .filter(Boolean);

  return [
    ato.controle,
    padControle(ato.controle),
    fmtLivro(ato.livro),
    fmtPagina(ato.pagina),
    `${fmtLivro(ato.livro)}${fmtPagina(ato.pagina)}`,
    `${ato.livro || ''}/${ato.pagina || ''}`,
    ato.tipo_ato,
    ato.nome_tomador,
    ato.forma_pagamento,
    ato.forma_pagamento_lancado,
    ato.forma_pagamento_confirmado,
    ato.status,
    sLabel(ato.status),
    ...names,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');
}

export function atoMatchesSearch(ato, query, escreventesById) {
  const term = normalizeText(query);
  if (!term) return true;

  const ref = parseRef(term);
  if (ref) {
    return Number.parseInt(ato.livro, 10) === ref.livro && Number.parseInt(ato.pagina, 10) === ref.pagina;
  }

  return buildAtoSearchHaystack(ato, escreventesById).includes(term);
}

