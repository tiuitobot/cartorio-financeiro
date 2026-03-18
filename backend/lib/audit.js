const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

function formatDatePtBr(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

function normalizeNullableString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function resolveVerificationStamp(nextVerifiedBy, previousAto) {
  const verifiedBy = normalizeNullableString(nextVerifiedBy);

  if (!verifiedBy) return null;

  if (
    previousAto
    && previousAto.verificado_por === verifiedBy
    && previousAto.verificado_em
  ) {
    return previousAto.verificado_em;
  }

  return formatDatePtBr();
}

function resolveHistoricDate(item, previousRowsById) {
  const previous = previousRowsById?.get(String(item?.id || ''));
  if (previous?.data) return previous.data;
  return formatDatePtBr();
}

module.exports = {
  formatDatePtBr,
  normalizeNullableString,
  resolveVerificationStamp,
  resolveHistoricDate,
};
