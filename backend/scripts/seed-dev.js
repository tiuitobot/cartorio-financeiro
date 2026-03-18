#!/usr/bin/env node
const bcrypt = require('bcrypt');
const db = require('../db');

const DEV_PASSWORD = process.env.SEED_DEV_PASSWORD || 'CartorioDev123';

const escreventes = [
  { id: 1, nome: 'João Silva', cargo: 'Escrevente Sênior', email: 'joao@cartorio.com', taxa: 6, ativo: true },
  { id: 2, nome: 'Maria Santos', cargo: 'Escrevente', email: 'maria@cartorio.com', taxa: 20, ativo: true },
  { id: 3, nome: 'Pedro Oliveira', cargo: 'Escrevente', email: 'pedro@cartorio.com', taxa: 20, ativo: true },
  { id: 4, nome: 'Ana Costa', cargo: 'Escrevente', email: 'ana@cartorio.com', taxa: 30, ativo: true },
  { id: 5, nome: 'Carlos Mendes', cargo: 'Estagiário', email: 'carlos@cartorio.com', taxa: 30, ativo: true },
];

const compartilhamentos = [
  { escrevente_id: 1, compartilha_com_id: 2 },
  { escrevente_id: 4, compartilha_com_id: 3 },
];

const usuarios = [
  { id: 1, nome: 'Tabelião Admin', email: 'admin@cartorio.com', perfil: 'admin', escrevente_id: null, ativo: true },
  { id: 2, nome: 'Chefe Financeiro', email: 'chefe@cartorio.com', perfil: 'chefe_financeiro', escrevente_id: null, ativo: true },
  { id: 3, nome: 'Ana Financeiro', email: 'financeiro@cartorio.com', perfil: 'financeiro', escrevente_id: null, ativo: true },
  { id: 4, nome: 'João Silva', email: 'joao@cartorio.com', perfil: 'escrevente', escrevente_id: 1, ativo: true },
  { id: 5, nome: 'Maria Santos', email: 'maria@cartorio.com', perfil: 'escrevente', escrevente_id: 2, ativo: true },
];

const atos = [
  {
    id: 1,
    controle: '00042',
    livro: '42',
    pagina: '15',
    data_ato: '2026-03-10',
    captador_id: 1,
    executor_id: 2,
    signatario_id: 4,
    emolumentos: 850.0,
    repasses: 120.0,
    issqn: 25.5,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    escrevente_reembolso_id: null,
    valor_pago: 995.5,
    data_pagamento: '2026-03-12',
    forma_pagamento: 'PIX',
    status: 'pago',
    verificado_por: 'Tabelião',
    verificado_em: '10/03/2026',
    comissao_override: null,
    notas: '',
  },
  {
    id: 2,
    controle: '00043',
    livro: '42',
    pagina: '16',
    data_ato: '2026-03-11',
    captador_id: 1,
    executor_id: 3,
    signatario_id: null,
    emolumentos: 1200.0,
    repasses: 80.0,
    issqn: 36.0,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    escrevente_reembolso_id: null,
    valor_pago: 0,
    data_pagamento: null,
    forma_pagamento: null,
    status: 'pendente',
    verificado_por: null,
    verificado_em: null,
    comissao_override: null,
    notas: '',
  },
  {
    id: 3,
    controle: '00044',
    livro: '42',
    pagina: '17',
    data_ato: '2026-03-08',
    captador_id: 2,
    executor_id: 2,
    signatario_id: 5,
    emolumentos: 620.0,
    repasses: 50.0,
    issqn: 18.6,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 80.0,
    escrevente_reembolso_id: 2,
    valor_pago: 500.0,
    data_pagamento: '2026-03-09',
    forma_pagamento: 'Dinheiro',
    status: 'pago_menor',
    verificado_por: null,
    verificado_em: null,
    comissao_override: null,
    notas: 'Cliente pagou parcialmente.',
  },
  {
    id: 4,
    controle: '00045',
    livro: '42',
    pagina: '18',
    data_ato: '2026-03-05',
    captador_id: 3,
    executor_id: 3,
    signatario_id: 4,
    emolumentos: 2400.0,
    repasses: 200.0,
    issqn: 72.0,
    reembolso_tabeliao: 50.0,
    reembolso_escrevente: 0,
    escrevente_reembolso_id: null,
    valor_pago: 2722.0,
    data_pagamento: '2026-03-06',
    forma_pagamento: 'Transferência',
    status: 'pago',
    verificado_por: 'Financeiro',
    verificado_em: '05/03/2026',
    comissao_override: null,
    notas: '',
  },
  {
    id: 5,
    controle: '00046',
    livro: '42',
    pagina: '19',
    data_ato: '2026-03-14',
    captador_id: 5,
    executor_id: 5,
    signatario_id: 1,
    emolumentos: 1800.0,
    repasses: 150.0,
    issqn: 54.0,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    escrevente_reembolso_id: null,
    valor_pago: 0,
    data_pagamento: null,
    forma_pagamento: null,
    status: 'pendente',
    verificado_por: null,
    verificado_em: null,
    comissao_override: null,
    notas: '',
  },
  {
    id: 6,
    controle: '00047',
    livro: '42',
    pagina: '20',
    data_ato: '2026-03-15',
    captador_id: 4,
    executor_id: 2,
    signatario_id: 1,
    emolumentos: 950.0,
    repasses: 90.0,
    issqn: 28.5,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    escrevente_reembolso_id: null,
    valor_pago: 1068.5,
    data_pagamento: '2026-03-16',
    forma_pagamento: 'Cartão de débito',
    status: 'pago',
    verificado_por: 'Chefe Financeiro',
    verificado_em: '15/03/2026',
    comissao_override: JSON.stringify([
      { escrevente_id: 4, nome: 'Ana Costa', papel: 'Captador', pct: 20, fixo: 0, total: 190 },
      { escrevente_id: 2, nome: 'Maria Santos', papel: 'Executor', pct: 6, fixo: 0, total: 57 },
      { escrevente_id: 1, nome: 'João Silva', papel: 'Signatário', pct: null, fixo: 20, total: 20 },
    ]),
    notas: 'Ato com comissão ajustada manualmente para homologação.',
  },
];

const correcoes = [
  {
    id: 101,
    ato_id: 3,
    autor: 'Financeiro',
    autor_id: null,
    mensagem: 'Valor de emolumentos diverge da tabela.',
    data: '08/03/2026',
    status: 'aguardando',
  },
];

const reembolsos = [
  {
    id: 1,
    escrevente_id: 2,
    data: '2026-03-09',
    valor: 80.0,
    notas: 'Reembolso ato 00044 — despesa de registro',
    confirmado_escrevente: false,
  },
  {
    id: 2,
    escrevente_id: 1,
    data: '2026-02-23',
    valor: 45.0,
    notas: 'Reembolso ato 00038 — cartório de imóveis',
    confirmado_escrevente: true,
  },
];

const reivindicacoes = [
  {
    id: 1,
    ato_id: 2,
    escrevente_id: 4,
    escrevente_nome: 'Ana Costa',
    funcao: 'signatario',
    data: '12/03/2026',
    status: 'pendente',
    justificativa: '',
    decisao_financeiro: '',
  },
  {
    id: 2,
    ato_id: 5,
    escrevente_id: 3,
    escrevente_nome: 'Pedro Oliveira',
    funcao: 'executor',
    data: '15/03/2026',
    status: 'recusada',
    justificativa: 'Não participei deste ato.',
    decisao_financeiro: '',
  },
];

async function resetSequence(client, tableName) {
  await client.query(
    `SELECT setval(
      pg_get_serial_sequence($1, 'id'),
      COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
      true
    )`,
    [tableName]
  );
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_SEED !== '1') {
    throw new Error('seed-dev bloqueado em NODE_ENV=production. Use apenas em ambiente local.');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        correcoes,
        pagamentos_reembolso,
        reivindicacoes,
        atos,
        usuarios,
        escreventes_compartilhamento,
        escreventes
      RESTART IDENTITY CASCADE
    `);

    for (const item of escreventes) {
      await client.query(
        `INSERT INTO escreventes(id,nome,cargo,email,taxa,ativo)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [item.id, item.nome, item.cargo, item.email, item.taxa, item.ativo]
      );
    }

    for (const item of compartilhamentos) {
      await client.query(
        `INSERT INTO escreventes_compartilhamento(escrevente_id,compartilha_com_id)
         VALUES($1,$2)`,
        [item.escrevente_id, item.compartilha_com_id]
      );
    }

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
    for (const item of usuarios) {
      await client.query(
        `INSERT INTO usuarios(id,nome,email,senha_hash,perfil,escrevente_id,ativo)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [item.id, item.nome, item.email.toLowerCase(), passwordHash, item.perfil, item.escrevente_id, item.ativo]
      );
    }

    for (const item of atos) {
      await client.query(
        `INSERT INTO atos(
          id,controle,livro,pagina,data_ato,captador_id,executor_id,signatario_id,
          emolumentos,repasses,issqn,reembolso_tabeliao,reembolso_escrevente,escrevente_reembolso_id,
          valor_pago,data_pagamento,forma_pagamento,status,verificado_por,verificado_em,comissao_override,notas
        ) VALUES(
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21,$22
        )`,
        [
          item.id,
          item.controle,
          item.livro,
          item.pagina,
          item.data_ato,
          item.captador_id,
          item.executor_id,
          item.signatario_id,
          item.emolumentos,
          item.repasses,
          item.issqn,
          item.reembolso_tabeliao,
          item.reembolso_escrevente,
          item.escrevente_reembolso_id,
          item.valor_pago,
          item.data_pagamento,
          item.forma_pagamento,
          item.status,
          item.verificado_por,
          item.verificado_em,
          item.comissao_override,
          item.notas,
        ]
      );
    }

    for (const item of correcoes) {
      await client.query(
        `INSERT INTO correcoes(id,ato_id,autor,autor_id,mensagem,data,status)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [item.id, item.ato_id, item.autor, item.autor_id, item.mensagem, item.data, item.status]
      );
    }

    for (const item of reembolsos) {
      await client.query(
        `INSERT INTO pagamentos_reembolso(id,escrevente_id,data,valor,notas,confirmado_escrevente)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [item.id, item.escrevente_id, item.data, item.valor, item.notas, item.confirmado_escrevente]
      );
    }

    for (const item of reivindicacoes) {
      await client.query(
        `INSERT INTO reivindicacoes(
          id,ato_id,escrevente_id,escrevente_nome,funcao,data,status,justificativa,decisao_financeiro
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          item.id,
          item.ato_id,
          item.escrevente_id,
          item.escrevente_nome,
          item.funcao,
          item.data,
          item.status,
          item.justificativa,
          item.decisao_financeiro,
        ]
      );
    }

    await resetSequence(client, 'escreventes');
    await resetSequence(client, 'usuarios');
    await resetSequence(client, 'atos');
    await resetSequence(client, 'correcoes');
    await resetSequence(client, 'pagamentos_reembolso');
    await resetSequence(client, 'reivindicacoes');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  console.log('✓ seed local aplicada com dados sintéticos');
  console.log('  Senha padrão dos usuários seed:', DEV_PASSWORD);
  console.log('  Logins:');
  console.log('   - admin@cartorio.com (admin)');
  console.log('   - chefe@cartorio.com (chefe_financeiro)');
  console.log('   - financeiro@cartorio.com (financeiro)');
  console.log('   - joao@cartorio.com (escrevente)');
  console.log('   - maria@cartorio.com (escrevente)');
}

main()
  .catch((error) => {
    console.error('✗ falha ao aplicar seed local:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => {});
  });
