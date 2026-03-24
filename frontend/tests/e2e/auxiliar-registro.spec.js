const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function loginDashboard(page, email, senha) {
  await login(page, email, senha);
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

test.describe('auxiliar_registro e2e', () => {
  test('auxiliar de registro acessa apenas o módulo de registro após trocar a senha inicial', async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const nome = `QA Auxiliar ${suffix}`;
    const email = `qa-aux-${suffix}@cartorio.com`;
    const senhaInicial = 'Auxiliar123';
    const senhaFinal = 'Auxiliar456';
    const uniqueDescricao = `QA despesa auxiliar ${suffix}`;

    await loginDashboard(page, 'admin@cartorio.com', 'CartorioDev123');
    await page.getByRole('button', { name: /Usuários/ }).click();
    await page.getByRole('button', { name: /Novo Usuário/ }).click();

    await page.getByLabel('Nome').fill(nome);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha inicial').fill(senhaInicial);
    await page.getByLabel('Perfil').selectOption('auxiliar_registro');
    await page.getByRole('button', { name: '💾 Salvar' }).click();

    await expect(page.getByText(nome)).toBeVisible();
    await page.getByRole('button', { name: /Sair/ }).click();

    await login(page, email, senhaInicial);
    const botaoAlterarSenha = page.getByRole('button', { name: 'Alterar e continuar' });
    const modalAberto = await botaoAlterarSenha.waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false);
    if (!modalAberto) {
      await expect(page.getByText('Troca obrigatória de senha', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Abrir troca de senha' }).click();
      await expect(botaoAlterarSenha).toBeVisible();
    }

    await page.getByLabel('Senha atual', { exact: true }).fill(senhaInicial);
    await page.getByLabel('Nova senha', { exact: true }).fill(senhaFinal);
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill(senhaFinal);
    await botaoAlterarSenha.click();

    await expect(page.getByRole('heading', { level: 1, name: 'Despesas de Registro' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Registro/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Dashboard/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Livros de Notas/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Relatórios/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Importações/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Escreventes/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Usuários/ })).toHaveCount(0);

    await page.getByRole('button', { name: /Nova Despesa/ }).click();
    await page.getByLabel('Controle').fill(`98${suffix}`);
    await page.getByLabel('Valor').fill('987');
    await page.getByLabel('Descrição').fill(uniqueDescricao);
    await page.getByRole('button', { name: '💾 Salvar' }).click();

    await expect(page.getByText(uniqueDescricao)).toBeVisible();

    const row = page.locator('tr', { hasText: uniqueDescricao }).first();
    await row.getByRole('button', { name: /Editar/ }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '🗑️ Excluir' }).click();

    await expect(page.getByText(uniqueDescricao)).toHaveCount(0);
  });
});
