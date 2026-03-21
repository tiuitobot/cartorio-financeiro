const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

test.describe('smoke e2e', () => {
  test('admin navega pelas views principais', async ({ page }) => {
    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await expect(page.getByRole('button', { name: /Escreventes/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Usuários/ })).toBeVisible();
    await expect(page.getByText('Total Faturado')).toBeVisible();

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();
    const linhasAtos = page.locator('table tbody tr');
    await expect(linhasAtos.first()).toBeVisible();
    expect(await linhasAtos.count()).toBeGreaterThanOrEqual(6);
    await expect(page.getByRole('button', { name: /Novo Ato/ })).toBeVisible();
    await expect(page.getByText('00047')).toBeVisible();
    await expect(page.getByRole('button', { name: /Conferir|Conferido|Conferência/ }).first()).toBeVisible();

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await expect(page.getByRole('button', { name: /Atos/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mensal/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Comissões/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reembolsos/ })).toBeVisible();

    await page.getByRole('button', { name: /Escreventes/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Escreventes' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Novo Escrevente/ })).toBeVisible();
    await expect(page.getByText('João Silva')).toBeVisible();

    await page.getByRole('button', { name: /Usuários/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Novo Usuário/ })).toBeVisible();
    await expect(page.getByText('admin@cartorio.com')).toBeVisible();
  });

  test('admin acessa modo dedicado de conferência financeira', async ({ page }) => {
    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();

    const primeiraLinha = page.locator('table tbody tr').first();
    await primeiraLinha.getByRole('button', { name: /Conferir|Conferido|Conferência/ }).click();

    await expect(page.getByText('Modo de conferência financeira')).toBeVisible();
    await expect(page.getByRole('button', { name: /Salvar conferência financeira|Criar ato e salvar conferência/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar ato' })).toHaveCount(0);
  });

  test('escrevente vê escopo reduzido e acessa modal de declaração', async ({ page }) => {
    await login(page, 'joao@cartorio.com', 'CartorioDev123');

    await expect(page.getByRole('button', { name: /Escreventes/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Usuários/ })).toHaveCount(0);

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();
    const linhasAtos = page.locator('table tbody tr');
    await expect(linhasAtos.first()).toBeVisible();
    expect(await linhasAtos.count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByRole('button', { name: /Declaro Participação/ })).toBeVisible();
    await expect(page.getByText('00044')).toBeVisible();

    await page.getByRole('button', { name: /Declaro Participação/ }).click();
    await expect(page.getByText('Reivindicação de Participação')).toBeVisible();

    await page.locator('input[placeholder="ex: 00042 ou L42P15"]').fill('00044');
    await page.getByRole('button', { name: /Buscar/ }).click();

    await expect(page.getByText('Ato encontrado')).toBeVisible();
    await expect(page.locator('strong').filter({ hasText: '00044' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Enviar Declaração/ })).toBeVisible();
  });
});
