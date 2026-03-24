const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

async function logout(page) {
  await page.getByRole('button', { name: /Sair/ }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
}

test.describe('alertas de contestação de reembolso e2e', () => {
  test('financeiro recebe alerta proativo quando escrevente contesta reembolso', async ({ page }) => {
    const uniqueNotes = `QA alerta reembolso ${Date.now()}`;
    const uniqueJustificativa = `QA contestacao ${Date.now()}`;

    await login(page, 'admin@cartorio.com', 'CartorioDev123');
    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Reembolsos/ }).click();

    const saldoRow = page.locator('tr', { hasText: 'João Silva' }).first();
    await saldoRow.getByRole('button', { name: /\+ Registrar Pgto/ }).click();

    await expect(page.getByText('Reembolso Escrevente')).toBeVisible();
    await page.getByLabel('Valor Pago').fill('1234');
    await page.getByLabel('Observações').fill(uniqueNotes);
    await page.getByRole('button', { name: '💾 Registrar' }).click();

    await expect(page.getByText(uniqueNotes)).toBeVisible();
    await logout(page);

    await login(page, 'joao@cartorio.com', 'CartorioDev123');
    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Reembolsos/ }).click();

    const historicoRowEscrevente = page.locator('tr', { hasText: uniqueNotes }).first();
    page.once('dialog', (dialog) => dialog.accept(uniqueJustificativa));
    await historicoRowEscrevente.getByRole('button', { name: 'Não reconheço' }).click();

    await expect(page.getByText('Contestado')).toBeVisible();
    await expect(page.getByText(uniqueJustificativa).first()).toBeVisible();
    await logout(page);

    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await expect(page.getByText(/contestação\(ões\) de reembolso aguardando análise/i)).toBeVisible();
    await expect(page.getByText(uniqueJustificativa).first()).toBeVisible();
    await page.getByRole('button', { name: 'Abrir Reembolsos' }).click();

    await expect(page.getByText(uniqueJustificativa).first()).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar Pagamento' }).click();

    await expect(page.getByText(uniqueJustificativa)).toHaveCount(0);
    await expect(page.getByText(/Contestação de Reembolso Aguardando Financeiro/)).toHaveCount(0);
  });
});
