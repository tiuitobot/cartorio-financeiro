export const FORMAS_PAGAMENTO = [
  'Pix',
  'TED',
  'Boleto',
  'Vale',
  'Cartão Débito',
  'Cartão Crédito',
  'Dinheiro',
  'Cheque',
  'Depósito/Transferência',
  'Outro',
];

export function normalizeFormaPagamento(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const key = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const mapping = {
    PIX: 'Pix',
    TED: 'TED',
    BOLETO: 'Boleto',
    VALE: 'Vale',
    DINHEIRO: 'Dinheiro',
    CHEQUE: 'Cheque',
    TRANSFERENCIA: 'TED',
    'DEPOSITO/TRANSFERENCIA': 'TED',
    'DEPOSITO / TRANSFERENCIA': 'TED',
    'DEPOSITO TRANSFERENCIA': 'TED',
    'CARTAO DE DEBITO': 'Cartão Débito',
    'CARTAO DE CREDITO': 'Cartão Crédito',
    'CARTAO DEBITO': 'Cartão Débito',
    'CARTAO CREDITO': 'Cartão Crédito',
  };

  return mapping[key] || text;
}
