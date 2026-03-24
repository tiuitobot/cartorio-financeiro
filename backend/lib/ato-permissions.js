function toMoney(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function canEditAto(user) {
  return ['admin', 'financeiro', 'chefe_financeiro'].includes(user?.perfil);
}

function canEditReembolsoTabeliao(user) {
  return ['admin', 'financeiro', 'chefe_financeiro'].includes(user?.perfil);
}

function moneyChanged(previousValue, nextValue) {
  return Math.abs(toMoney(previousValue) - toMoney(nextValue)) > 0.005;
}

function validateReembolsoTabeliaoWrite({ actor, previousAto, nextAto }) {
  const previousValue = previousAto ? previousAto.reembolso_tabeliao : 0;
  const nextValue = nextAto?.reembolso_tabeliao;

  if (!moneyChanged(previousValue, nextValue)) return null;
  if (canEditReembolsoTabeliao(actor)) return null;

  return 'Permissão insuficiente para alterar reembolso do tabelião';
}

module.exports = {
  canEditAto,
  canEditReembolsoTabeliao,
  validateReembolsoTabeliaoWrite,
};
