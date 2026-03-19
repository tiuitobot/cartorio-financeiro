const XLSX = require('xlsx');
const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

function createWorkbookFixture(filePath) {
  const headers = [
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

  const rows = [
    headers,
    ['18/03/2026', 'PROCURAÇÃO', '520', '1', '990001', 'Maria Santos', '850,00', '', '', '19/03/2026', '19/03/2026', 'Pix', 'CHK-001'],
    ['18/03/2026', '', '520', '2', '990002', 'Maria Santos', '1200,00', '', '', '', '', 'Dinheiro', ''],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Livro de Escrituras');
  XLSX.writeFile(workbook, filePath);
}

test.describe('importações e2e', () => {
  test('admin faz upload, gera preview e importa lote', async ({ page }, testInfo) => {
    const fixturePath = testInfo.outputPath('controle-importacao.xlsx');
    createWorkbookFixture(fixturePath);

    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Importações/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Importações' })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await page.getByRole('button', { name: 'Gerar Preview' }).click();

    await expect(page.getByText(/Preview gerado para/)).toBeVisible();
    await expect(page.getByText(/Erro: ATO ausente/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar Lote' })).toBeEnabled();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Importar Lote' }).click();

    await expect(page.getByText('Resultado da importação')).toBeVisible();
    await expect(page.getByText(/Importação concluída: 1 linhas importadas e 1 puladas\./)).toBeVisible();

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();

    await page.locator('input[placeholder="Controle ou L42P15..."]').fill('990001');
    await expect(page.getByText('990001')).toBeVisible();
  });
});
