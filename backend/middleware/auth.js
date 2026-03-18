const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
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

module.exports = { authMiddleware, requirePerfil };
