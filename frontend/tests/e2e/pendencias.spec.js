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
  test('admin visualiza pendências automáticas (sem botão solucionar)', async ({ page }) => {
    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Pendências/ }).click();

    await expect(page.getByText('Conciliação e Pendências')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abertas' })).toBeVisible();

    // Solucionar foi removido — apenas "Abrir ato" deve existir
    await expect(page.getByRole('button', { name: 'Solucionar' })).toHaveCount(0);

    const openRows = page.locator('table tbody tr');
    await expect(openRows.first()).toBeVisible();
    const count = await openRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('escrevente registra manifestação com tipo de situação', async ({ page }) => {
    await login(page, 'joao@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await page.getByRole('button', { name: /Manifestar Pendência/ }).click();

    const modal = page.locator('div[style*="inset: 0"]');
    await expect(modal).toBeVisible();

    // Selecionar tipo de situação (obrigatório)
    await modal.locator('select').selectOption('retificar_valores');

    // Preencher controle (opcional) e mensagem
    await modal.locator('input[placeholder="00042"]').fill('00042');
    await modal.locator('textarea').fill('QA pendência do escrevente');
    await modal.getByRole('button', { name: 'Registrar manifestação' }).click();

    // Modal deve fechar após sucesso
    await expect(modal).toBeHidden();

    // Verificar na aba pendências
    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Pendências/ }).click();

    await expect(page.getByText('QA pendência do escrevente')).toBeVisible();
    await expect(page.getByText('Manifestação do escrevente')).toBeVisible();
  });
});
