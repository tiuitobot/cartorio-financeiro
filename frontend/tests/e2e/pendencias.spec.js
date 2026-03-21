const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

test.describe('pendências e2e', () => {
  test('admin visualiza e trata pendências automáticas', async ({ page }) => {
    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Pendências/ }).click();

    await expect(page.getByText('Conciliação e Pendências')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abertas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solucionar' }).first()).toBeVisible();

    const openRows = page.locator('table tbody tr');
    const beforeCount = await openRows.count();

    page.once('dialog', (dialog) => dialog.accept('Resolvido no teste automatizado'));
    await openRows.first().getByRole('button', { name: 'Solucionar' }).click();

    await expect.poll(async () => openRows.count()).toBe(beforeCount - 1);
  });

  test('escrevente registra manifestação de pendência pelo controle', async ({ page }) => {
    await login(page, 'joao@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await page.getByRole('button', { name: /Manifestar Pendência/ }).click();

    await expect(page.locator('textarea[placeholder*="Descreva a pendência"]')).toBeVisible();
    await page.locator('input[placeholder="00042"]').fill('00042');
    await page.locator('textarea[placeholder*="Descreva a pendência"]').fill('QA pendência do escrevente');
    await page.getByRole('button', { name: 'Registrar manifestação' }).click();

    await expect(page.locator('textarea[placeholder*="Descreva a pendência"]')).toHaveCount(0);

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Pendências/ }).click();

    await expect(page.getByText('QA pendência do escrevente')).toBeVisible();
    await expect(page.getByText('Manifestação do escrevente')).toBeVisible();
  });
});
