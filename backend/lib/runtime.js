function missing(value) {
  return !String(value || '').trim();
}

function validateRuntimeConfig(env) {
  const errors = [];

  if (missing(env.JWT_SECRET)) {
    errors.push('JWT_SECRET é obrigatório.');
  }

  if (missing(env.DATABASE_URL) && missing(env.DB_PASSWORD)) {
    errors.push('Defina DATABASE_URL ou DB_PASSWORD para acesso ao PostgreSQL.');
  }

  return errors;
}

module.exports = { validateRuntimeConfig };
