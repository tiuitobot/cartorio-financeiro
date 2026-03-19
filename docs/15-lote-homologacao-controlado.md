# Lote Controlado de Homologacao

Data de referencia: 19/03/2026.

## Objetivo

Deixar um arquivo `.xlsx` de teste mais proximo do uso real do cartorio, mas ainda controlado e reproduzivel.

Esse lote serve para:

- exercitar upload e preview
- validar linhas com erro
- validar alertas de duplicidade
- validar importacao parcial
- testar nomes de escreventes compativeis com a seed de homologacao

## Gerador

Script:

- [generate-homolog-import-xlsx.js](/home/linuxadmin/repos/cartorio-financeiro/backend/scripts/generate-homolog-import-xlsx.js)

Comando:

```bash
cd /home/linuxadmin/repos/cartorio-financeiro/backend
npm run fixture:homolog:xlsx
```

Saida padrao:

- `/home/linuxadmin/repos/cartorio-financeiro/tmp/controle_diario_homologacao.xlsx`

Tambem aceita caminho customizado:

```bash
cd /home/linuxadmin/repos/cartorio-financeiro/backend
node scripts/generate-homolog-import-xlsx.js /tmp/meu_lote_homologacao.xlsx
```

## Conteudo do lote

O arquivo gerado tem `10` linhas de dados com:

- nomes compativeis com a seed: `Maria Santos`, `João Silva`, `Pedro Oliveira`, `Ana Costa`, `Carlos Mendes`
- controles curtos e longos
- `Repasses` e `ISSQN` preenchidos em algumas linhas
- formas de pagamento variadas
- linhas invalidas para testar preview
- duplicidade de `CONTROLE`
- duplicidade de `Livro/Página`

## Resultado esperado no preview

Esperado para o lote controlado:

- `10` linhas totais
- `7` linhas validas
- `3` linhas com erro
- alertas por duplicidade dentro da planilha

Linhas invalidas intencionais:

- 1 linha sem `ATO`
- 1 linha sem `DATA DO ATO`
- 1 linha sem `Página`

Alertas intencionais:

- controle duplicado
- livro/pagina duplicado
- forma de pagamento fora da padronizacao em uma linha (`Transferência`)

## Compatibilidade com a homologacao Railway

Esse lote foi pensado para a homologacao com seed padrao em:

- [14-railway-homologacao.md](/home/linuxadmin/repos/cartorio-financeiro/docs/14-railway-homologacao.md)

Os nomes dos escreventes batem com a seed remota, entao a importacao nao depende dos nomes reais da planilha do Henrique.

## Validacao desta rodada

Foi validado em `19/03/2026`:

- geracao local do arquivo em `tmp/controle_diario_homologacao.xlsx`
- upload de preview no ambiente `cartorio-financeiro-homolog`
- lote de preview criado remotamente com sucesso

Resultado observado no preview remoto:

- `10` linhas totais
- `7` validas
- `3` com erro
- `10` com alerta

Na validacao desta rodada, o preview remoto foi persistido como lote `#2` na homologacao. Esse numero pode mudar se a base for reseeded.

## Uso recomendado

Ordem pratica:

1. reaplicar a seed da homologacao, se necessario
2. gerar o arquivo `.xlsx`
3. subir pela tela `Importações`
4. revisar o preview
5. importar o lote
6. validar os atos importados em `Livros de Notas`

## Observacao importante

Esse lote e para homologacao tecnica.

Ele nao substitui:

- a planilha real do Henrique
- a conciliacao dos nomes reais de escreventes
- a homologacao final das regras de pagamento
