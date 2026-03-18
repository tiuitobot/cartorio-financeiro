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

  return { where: '', params: [] };
}

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

  return { where: '', params: [] };
}

module.exports = {
  buildReembolsosScope,
  buildReivindicacoesScope,
};
