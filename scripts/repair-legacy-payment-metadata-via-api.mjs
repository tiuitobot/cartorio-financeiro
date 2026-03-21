#!/usr/bin/env node

const args = process.argv.slice(2);

function readFlag(name, fallback = null) {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] || fallback;
  return fallback;
}

const baseUrl = readFlag('--base-url', process.env.CARTORIO_BASE_URL);
const email = readFlag('--email', process.env.CARTORIO_ADMIN_EMAIL);
const senha = readFlag('--senha', process.env.CARTORIO_ADMIN_SENHA);
const apply = args.includes('--apply');

if (!baseUrl || !email || !senha) {
  console.error('Uso: node scripts/repair-legacy-payment-metadata-via-api.mjs --base-url <url> --email <email> --senha <senha> [--apply]');
  process.exit(1);
}

function toNumber(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePagamentoForWrite(pagamento = {}) {
  return {
    id: Number.isInteger(Number.parseInt(pagamento.id, 10)) ? Number.parseInt(pagamento.id, 10) : undefined,
    valor: toNumber(pagamento.valor),
    data_pagamento: pagamento.data_pagamento || null,
    forma_pagamento: pagamento.forma_pagamento || null,
    notas: pagamento.notas || null,
    confirmado_financeiro: pagamento.confirmado_financeiro === true,
    confirmado_financeiro_por: pagamento.confirmado_financeiro_por || null,
    confirmado_financeiro_em: pagamento.confirmado_financeiro_em || null,
  };
}

function buildAtoPayload(ato) {
  const pagamentos = Array.isArray(ato.pagamentos)
    ? ato.pagamentos
      .filter((pagamento) => toNumber(pagamento.valor) > 0)
      .map(normalizePagamentoForWrite)
    : [];

  return {
    controle: ato.controle,
    livro: ato.livro,
    pagina: ato.pagina,
    data_ato: ato.data_ato,
    tipo_ato: ato.tipo_ato,
    nome_tomador: ato.nome_tomador,
    captador_id: ato.captador_id,
    executor_id: ato.executor_id,
    signatario_id: ato.signatario_id,
    emolumentos: ato.emolumentos,
    repasses: ato.repasses,
    issqn: ato.issqn,
    reembolso_tabeliao: ato.reembolso_tabeliao,
    reembolso_escrevente: ato.reembolso_escrevente,
    escrevente_reembolso_id: ato.escrevente_reembolso_id,
    pagamentos,
    controle_cheques: ato.controle_cheques,
    comissao_override: ato.comissao_override,
    notas: ato.notas,
  };
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!response.ok) {
    const detail = typeof json === 'string' ? json : JSON.stringify(json);
    throw new Error(`${response.status} ${response.statusText}: ${detail}`);
  }

  return json;
}

async function main() {
  const login = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  const token = login.token;

  const atos = await api('/api/atos', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const targets = atos.filter((ato) =>
    Array.isArray(ato.pagamentos) && ato.pagamentos.some((pagamento) => !pagamento.id)
  );

  const report = {
    totalAtos: atos.length,
    targeted: targets.length,
    repaired: [],
    dryRun: !apply,
  };

  for (const ato of targets) {
    const payload = buildAtoPayload(ato);
    const syntheticCount = (ato.pagamentos || []).filter((pagamento) => !pagamento.id).length;
    const zeroSyntheticCount = (ato.pagamentos || []).filter((pagamento) => !pagamento.id && toNumber(pagamento.valor) <= 0).length;

    if (apply) {
      await api(`/api/atos/${ato.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    report.repaired.push({
      id: ato.id,
      controle: ato.controle,
      syntheticCount,
      zeroSyntheticCount,
      resultingPagamentos: payload.pagamentos.length,
    });
  }

  const after = await api('/api/atos', {
    headers: { Authorization: `Bearer ${token}` },
  });
  report.remainingSynthetic = after.filter((ato) =>
    Array.isArray(ato.pagamentos) && ato.pagamentos.some((pagamento) => !pagamento.id)
  ).map((ato) => ato.controle);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
