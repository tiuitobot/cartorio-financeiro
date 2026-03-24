const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

async function waitForPreferenceSave(page) {
  await page.waitForResponse((response) => (
    response.url().includes('/api/usuarios/preferencias')
    && response.request().method() === 'PUT'
    && response.ok()
  ));
}

async function maybeWaitForPreferenceSave(page, timeout = 1500) {
  try {
    await page.waitForResponse((response) => (
      response.url().includes('/api/usuarios/preferencias')
      && response.request().method() === 'PUT'
      && response.ok()
    ), { timeout });
  } catch (error) {
    if (!String(error?.message || '').includes('waitForResponse')) {
      throw error;
    }
  }
}

async function setColumnState(panel, label, shouldBeChecked) {
  const option = panel.locator('label', { hasText: new RegExp(`^${label}$`) });
  const checkbox = option.locator('input[type="checkbox"]');
  const isChecked = await checkbox.isChecked();

  if (isChecked !== shouldBeChecked) {
    await checkbox.evaluate((element) => element.click());
    if (shouldBeChecked) {
      await expect(checkbox).toBeChecked();
    } else {
      await expect(checkbox).not.toBeChecked();
    }
  }
}

test.describe('preferências de colunas e2e', () => {
  test('admin mantém colunas de livros e relatórios após reload', async ({ page }) => {
    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await page.getByRole('button', { name: /Colunas/ }).click();
    const painelLivros = page.locator('[role="dialog"]').filter({ hasText: 'Colunas visíveis' }).last();
    await setColumnState(painelLivros, 'Financeiro', false);
    await waitForPreferenceSave(page);
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(page.locator('table thead')).not.toContainText('Financeiro');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.locator('table thead')).not.toContainText('Financeiro');

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Atos/ }).click();
    await page.getByRole('button', { name: /Colunas/ }).click();
    const painelRelatorios = page.locator('[role="dialog"]').filter({ hasText: 'Colunas visíveis' }).last();
    await setColumnState(painelRelatorios, 'Saldo', false);
    await waitForPreferenceSave(page);
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(page.locator('table thead')).not.toContainText('Saldo');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Atos/ }).click();
    await expect(page.locator('table thead')).not.toContainText('Saldo');

    await page.getByRole('button', { name: /Colunas/ }).click();
    const painelRelatoriosReset = page.locator('[role="dialog"]').filter({ hasText: 'Colunas visíveis' }).last();
    await painelRelatoriosReset.getByRole('button', { name: 'Padrão' }).click();
    await maybeWaitForPreferenceSave(page);
    await page.getByRole('button', { name: 'Fechar' }).click();

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await page.getByRole('button', { name: /Colunas/ }).click();
    const painelLivrosReset = page.locator('[role="dialog"]').filter({ hasText: 'Colunas visíveis' }).last();
    await painelLivrosReset.getByRole('button', { name: 'Padrão' }).click();
    await maybeWaitForPreferenceSave(page);
    await page.getByRole('button', { name: 'Fechar' }).click();
  });
});
