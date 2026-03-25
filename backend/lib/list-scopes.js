function hasFullBackofficeAccess(user) {
  return ['admin', 'financeiro', 'chefe_financeiro'].includes(user?.perfil);
}

function missingEscreventeBinding(user) {
  return user?.perfil === 'escrevente' && !user?.escrevente_id;
}

function buildReembolsosScope(user) {
  if (missingEscreventeBinding(user)) {
    return { error: 'Usuário não vinculado a escrevente' };
  }

  if (user?.perfil === 'escrevente') {
    return {
      where: 'WHERE p.escrevente_id = $1',
      params: [user.escrevente_id],
    };
  }

  if (hasFullBackofficeAccess(user)) {
    return { where: '', params: [] };
  }

  return { error: 'Permissão insuficiente' };
}

// Reivindicações: escrevente vê as que ele criou (r.escrevente_id)
// e as que recebeu como captador (a.captador_id) para poder responder.
// Vínculo de compartilhamento NÃO afeta visibilidade de reivindicações.
function buildReivindicacoesScope(user) {
  if (missingEscreventeBinding(user)) {
    return { error: 'Usuário não vinculado a escrevente' };
  }

  if (user?.perfil === 'escrevente') {
    return {
      where: 'WHERE (r.escrevente_id = $1 OR a.captador_id = $1)',
      params: [user.escrevente_id],
    };
  }

  if (hasFullBackofficeAccess(user)) {
    return { where: '', params: [] };
  }

  return { error: 'Permissão insuficiente' };
}

// buildAtosScope: visibilidade de atos para escrevente.
// Regra: participação direta (captador_id, executor_id ou signatario_id).
function buildAtosScope(user) {
  if (missingEscreventeBinding(user)) {
    return { error: 'Usuário não vinculado a escrevente' };
  }
  if (user?.perfil === 'escrevente') {
    return {
      where: `
        WHERE (
          a.captador_id  = $1
          OR a.executor_id  = $1
          OR a.signatario_id = $1
        )
      `,
      params: [user.escrevente_id],
    };
  }

  if (hasFullBackofficeAccess(user)) {
    return { where: '', params: [] };
  }

  return { error: 'Permissão insuficiente' };
}

module.exports = {
  buildReembolsosScope,
  buildReivindicacoesScope,
  buildAtosScope,
};
