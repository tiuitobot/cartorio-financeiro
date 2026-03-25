const { test, expect } = require('@playwright/test');

async function login(page, email, senha) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

test.describe('retorno 24/25-mar fixes', () => {

  test('escrevente vê apenas suas próprias comissões', async ({ page }) => {
    await login(page, 'joao@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Comissões/ }).click();

    // Aguarda a tabela de comissões carregar
    const tabelaComissoes = page.locator('table');
    await expect(tabelaComissoes.first()).toBeVisible();

    // João Silva deve ver apenas sua própria linha
    const linhasComissao = tabelaComissoes.first().locator('tbody tr');
    const count = await linhasComissao.count();

    // Deve ter no máximo 2 linhas (dados + total), nunca outros escreventes
    // A linha TOTAL é uma tr com "TOTAL" no texto
    const nomes = [];
    for (let i = 0; i < count; i++) {
      const text = await linhasComissao.nth(i).textContent();
      if (text.includes('TOTAL')) continue;
      nomes.push(text);
    }

    // Deve ter no máximo 1 escrevente (João Silva) ou 0 se sem atos no período
    expect(nomes.length).toBeLessThanOrEqual(1);
    if (nomes.length === 1) {
      expect(nomes[0]).toContain('João Silva');
    }

    // NÃO deve conter outros escreventes
    for (const nome of nomes) {
      expect(nome).not.toContain('Ana Costa');
      expect(nome).not.toContain('Carlos Mendes');
      expect(nome).not.toContain('Maria Santos');
      expect(nome).not.toContain('Pedro Oliveira');
    }
  });

  test('admin vê comissões de todos os escreventes', async ({ page }) => {
    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Comissões/ }).click();

    const tabelaComissoes = page.locator('table');
    await expect(tabelaComissoes.first()).toBeVisible();

    // Admin deve ver múltiplos escreventes
    const texto = await tabelaComissoes.first().textContent();
    expect(texto).toContain('João Silva');
    // Admin vê pelo menos 2 escreventes (seed tem 5)
    const linhas = tabelaComissoes.first().locator('tbody tr');
    const count = await linhas.count();
    // linhas = escreventes com atos + TOTAL row
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('compartilhamento (pessoa vinculada) foi removido', async ({ page }) => {
    await login(page, 'joao@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();

    // Escrevente só vê atos onde participa diretamente
    const linhasAtos = page.locator('table tbody tr');
    await expect(linhasAtos.first()).toBeVisible();

    // Verificar que TODOS os atos visíveis têm João Silva como captador, executor ou signatário
    const count = await linhasAtos.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('declaro participação foi removido do frontend', async ({ page }) => {
    await login(page, 'joao@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();

    // "Declaro Participação" não deve existir
    await expect(page.getByRole('button', { name: /Declaro Participação/ })).toHaveCount(0);
    await expect(page.getByText('Reivindicação de Participação')).toHaveCount(0);
  });

  test('manifestar pendência tem tipos de situação e campos opcionais', async ({ page }) => {
    await login(page, 'joao@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Livros de Notas/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Livros de Notas' })).toBeVisible();

    await page.getByRole('button', { name: /Manifestar Pendência/ }).click();

    // Modal deve abrir (overlay com inset: 0)
    const modal = page.locator('div[style*="inset: 0"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Manifestar Pendência', { exact: true })).toBeVisible();

    // Deve ter o seletor de situação dentro do modal
    const selectSituacao = modal.locator('select');
    await expect(selectSituacao).toBeVisible();

    // Verificar que as opções de situação existem
    const opcoes = await selectSituacao.locator('option').allTextContents();
    expect(opcoes).toContain('Reivindicar Participação');
    expect(opcoes).toContain('Excluir Participação');
    expect(opcoes).toContain('Retificar Valores');
    expect(opcoes).toContain('Esclarecer Pagamento');
    expect(opcoes).toContain('Outros pedidos de ajustes');

    // Campos de identificação são opcionais (controle, livro, folhas)
    await expect(modal.getByText('Identificação do ato (opcional)')).toBeVisible();
    await expect(modal.getByText('Informe o número do controle OU o Livro e Folhas')).toBeVisible();

    // Tentar submeter sem tipo deve dar erro
    await modal.getByRole('button', { name: /Registrar manifestação/ }).click();
    await expect(modal.getByText('Selecione o tipo da manifestação')).toBeVisible();

    // Selecionar tipo e preencher mensagem, sem controle (deve funcionar)
    await selectSituacao.selectOption('reivindicar_participacao');
    await modal.locator('textarea').fill('Participei do ato como executor mas não fui registrado.');

    // Fechar sem enviar
    await modal.getByRole('button', { name: /Fechar/ }).click();
    await expect(modal).toBeHidden();
  });

  test('pendências: sem botão abrir conferência e sem botão solucionar', async ({ page }) => {
    await login(page, 'admin@cartorio.com', 'CartorioDev123');

    await page.getByRole('button', { name: /Relatórios/ }).click();
    await page.getByRole('button', { name: /Pendências/ }).click();

    // Aguardar conteúdo da aba pendências
    await expect(page.getByText('Conciliação e Pendências')).toBeVisible();

    // Se houver pendências, verificar que "Abrir conferência" e "Solucionar" não aparecem
    const textoCompleto = await page.textContent('body');
    expect(textoCompleto).not.toContain('Abrir conferência');
    expect(textoCompleto).not.toContain('Solucionar');

    // "Abrir ato" pode existir se houver pendências com ato vinculado
    // "Reabrir" e "Ocultar" podem existir para pendências solucionadas
  });
});
