const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

test.describe('despesas de registro e2e', () => {
  test('admin cria despesa pós-pagamento sem reabrir o status do ato e depois edita/exclui', async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const uniqueControle = '42';
    const uniqueDescricao = `QA despesa registro ${suffix}`;
    const updatedObs = `Observacao QA ${suffix}`;

    await login(page, 'admin@cartorio.com', 'CartorioDev123');
    await page.getByRole('button', { name: /Registro/ }).click();

    await page.getByRole('button', { name: /Nova Despesa/ }).click();
    await page.getByLabel('Controle').fill(uniqueControle);
    await page.getByLabel('Valor').fill('1234');
    await page.getByLabel('Descrição').fill(uniqueDescricao);
    await page.getByLabel('Cartório').fill('2º Registro de Imóveis QA');
    await page.getByLabel('Protocolo').fill(`QA-${suffix}`);
    await page.getByRole('button', { name: '💾 Salvar' }).click();

    await expect(page.getByText(uniqueDescricao)).toBeVisible();
    const row = page.locator('tr', { hasText: uniqueDescricao }).first();
    await expect(row.getByText('Após pagamento')).toBeVisible();
    await expect(row.getByText(/Status do ato mantido/i)).toBeVisible();
    await row.getByRole('button', { name: /Editar/ }).click();
    await page.getByLabel('Observações').fill(updatedObs);
    await page.getByRole('button', { name: '💾 Salvar' }).click();

    await expect(page.getByText('Despesa de registro atualizada.')).toBeVisible();

    const updatedRow = page.locator('tr', { hasText: uniqueDescricao }).first();
    await updatedRow.getByRole('button', { name: /Editar/ }).click();
    await expect(page.getByLabel('Observações')).toHaveValue(updatedObs);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '🗑️ Excluir' }).click();

    await expect(page.getByText(uniqueDescricao)).toHaveCount(0);
  });
});
