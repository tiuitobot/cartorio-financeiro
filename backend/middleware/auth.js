const jwt = require('jsonwebtoken');

function shouldBypassForcedPasswordChange(req) {
  return req.baseUrl === '/api/auth' && (
    req.path === '/me'
    || req.path === '/senha'
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (decoded.precisa_trocar_senha && !shouldBypassForcedPasswordChange(req)) {
      return res.status(428).json({
        erro: 'Troca de senha obrigatória antes de continuar',
        codigo: 'PASSWORD_CHANGE_REQUIRED',
      });
    }
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function requirePerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.user?.perfil)) {
      return res.status(403).json({ erro: 'Permissão insuficiente' });
    }
    next();
  };
}

module.exports = { authMiddleware, requirePerfil, shouldBypassForcedPasswordChange };
