const XLSX = require('xlsx');
const { test, expect } = require('@playwright/test');

const HEADERS = [
  'DATA DO ATO',
  'ATO',
  'Livro',
  'Página',
  'CONTROLE',
  'ESCREVENTE',
  'EMOLUMENTOS',
  'Repasses',
  'ISSQN',
  'Data Pagamento',
  'Confirmação Recebimento',
  'FORMA DE PG',
  'CONTROLE CHEQUES',
];

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

function createWorkbookFixture(filePath, rows) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Livro de Escrituras');
  XLSX.writeFile(workbook, filePath);
}

test.describe('importações e2e', () => {
  test('admin cancela um lote em preview', async ({ page }, testInfo) => {
    const fixturePath = testInfo.outputPath('controle-preview-cancelar.xlsx');
    createWorkbookFixture(fixturePath, [
      ['18/03/2026', 'PROCURAÇÃO', '520', '11', '991001', 'Escrevente Bootstrap', '850,00', '', '', '', '', 'Pix', 'CHK-011'],
    ]);

    await login(page, 'admin@cartorio.com', 'CartorioDev123');
    await page.getByRole('button', { name: /Importações/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Importações' })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await page.getByRole('button', { name: 'Gerar Preview' }).click();

    await expect(page.getByText(/Preview gerado para/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar Lote' })).toBeEnabled();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelar Lote' }).click();

    await expect(page.getByText(/Lote #\d+ cancelado\./)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Excluir Lote' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar Lote' })).toHaveCount(0);
  });

  test('admin importa e depois exclui um lote com rollback dos atos', async ({ page }, testInfo) => {
    const fixturePath = testInfo.outputPath('controle-importacao-excluir.xlsx');
    createWorkbookFixture(fixturePath, [
      ['18/03/2026', 'PROCURAÇÃO', '520', '21', '991101', 'Escrevente Bootstrap', '850,00', '', '', '19/03/2026', '19/03/2026', 'Pix', 'CHK-021'],
      ['18/03/2026', '', '520', '22', '991102', 'Escrevente Bootstrap', '1200,00', '', '', '', '', 'Dinheiro', ''],
    ]);

    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Importações/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Importações' })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await page.getByRole('button', { name: 'Gerar Preview' }).click();

    await expect(page.getByText(/Preview gerado para/)).toBeVisible();
    await expect(page.getByText(/Erro: ATO ausente/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar Lote' })).toBeEnabled();
    await expect(page.getByText(/Criar escreventes faltantes automaticamente/)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Importar Lote' }).click();

    await expect(page.getByText('Resultado da importação')).toBeVisible();
    await expect(page.getByText(/Importação concluída: 1 linhas importadas e 1 puladas\./)).toBeVisible();
    await expect(page.getByText(/Escrevente Bootstrap \(20%\)/)).toBeVisible();

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();

    await page.locator('input[placeholder="Controle ou L42P15..."]').fill('991101');
    await expect(page.locator('table tbody')).toContainText('991101');

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible();

    await page.locator('input[placeholder="Controle ou L42P15"]').fill('991101');
    const recebidoCard = page.locator('div').filter({ hasText: /^Recebido$/ }).locator('..');
    await expect(recebidoCard).toContainText('R$ 850,00');

    await page.getByRole('button', { name: /Importações/ }).click();
    await expect(page.getByText('Resultado da importação')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Excluir Lote' }).click();

    await expect(page.getByText(/1 ato\(s\) removido\(s\)/)).toBeVisible();
    await expect(page.getByText(/1 escrevente\(s\) auto-criado\(s\) removido\(s\)/)).toBeVisible();

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();
    await page.locator('input[placeholder="Controle ou L42P15..."]').fill('991101');
    await expect(page.locator('table tbody')).not.toContainText('991101');
  });
});
