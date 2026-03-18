#!/bin/bash
# ============================================================
#  Cartório de Notas — Script de Instalação
#  Ubuntu 22.04 LTS
#  Execute como root: sudo bash instalar.sh
# ============================================================
set -e

AZUL='\033[0;34m'; VERDE='\033[0;32m'; AMARELO='\033[1;33m'; VERMELHO='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${AZUL}[INFO]${NC} $1"; }
sucesso() { echo -e "${VERDE}[OK]${NC} $1"; }
aviso()   { echo -e "${AMARELO}[AVISO]${NC} $1"; }
erro()    { echo -e "${VERMELHO}[ERRO]${NC} $1"; exit 1; }

[ "$EUID" -ne 0 ] && erro "Execute como root: sudo bash instalar.sh"

# ── 1. Variáveis de configuração ──────────────────────────────────────────────
DB_NAME="cartorio"
DB_USER="cartorio_user"
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=')
APP_DIR="/var/www/cartorio"
LOG_DIR="/var/log/cartorio"

info "Iniciando instalação do Sistema de Gestão Financeira — Cartório de Notas"
echo ""

# ── 2. Atualizar sistema ──────────────────────────────────────────────────────
info "Atualizando pacotes do sistema..."
apt-get update -qq && apt-get upgrade -y -qq
sucesso "Sistema atualizado"

# ── 3. Node.js 20 ─────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v) != v20* ]]; then
  info "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -qq
  apt-get install -y nodejs -qq
  sucesso "Node.js $(node -v) instalado"
else
  sucesso "Node.js $(node -v) já instalado"
fi

# ── 4. PM2 ────────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "Instalando PM2..."
  npm install -g pm2 -q
  pm2 startup systemd -u root --hp /root | tail -1 | bash
  sucesso "PM2 instalado"
else
  sucesso "PM2 já instalado"
fi

# ── 5. PostgreSQL ─────────────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  info "Instalando PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib -qq
  sucesso "PostgreSQL instalado"
else
  sucesso "PostgreSQL já instalado"
fi

systemctl enable postgresql && systemctl start postgresql

# Criar banco e usuário
info "Configurando banco de dados..."
su -c "psql -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\" 2>/dev/null || true" postgres
su -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\" 2>/dev/null || true" postgres
su -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\"" postgres
sucesso "Banco de dados configurado: ${DB_NAME}"

# ── 6. Nginx ──────────────────────────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  info "Instalando Nginx..."
  apt-get install -y nginx -qq
  sucesso "Nginx instalado"
else
  sucesso "Nginx já instalado"
fi

# ── 7. Copiar arquivos da aplicação ───────────────────────────────────────────
info "Copiando arquivos da aplicação para ${APP_DIR}..."
mkdir -p "${APP_DIR}" "${LOG_DIR}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp -r "${SCRIPT_DIR}/backend"  "${APP_DIR}/"
cp -r "${SCRIPT_DIR}/frontend" "${APP_DIR}/"
cp    "${SCRIPT_DIR}/ecosystem.config.js" "${APP_DIR}/"
sucesso "Arquivos copiados"

# ── 8. Criar .env do backend ──────────────────────────────────────────────────
info "Criando arquivo de configuração .env..."
cat > "${APP_DIR}/backend/.env" << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=8h
PORT=3001
NODE_ENV=production
EOF
chmod 600 "${APP_DIR}/backend/.env"
sucesso ".env criado"

# ── 9. Instalar dependências Node ─────────────────────────────────────────────
info "Instalando dependências do backend..."
cd "${APP_DIR}/backend" && npm install --production -q
sucesso "Dependências do backend instaladas"

info "Instalando dependências do frontend..."
cd "${APP_DIR}/frontend" && npm install -q
sucesso "Dependências do frontend instaladas"

# ── 10. Build do frontend ─────────────────────────────────────────────────────
info "Compilando o frontend React..."
cd "${APP_DIR}/frontend" && npm run build -q
sucesso "Frontend compilado em dist/"

# ── 11. Aplicar schema do banco ───────────────────────────────────────────────
info "Criando tabelas no banco de dados..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" \
  -f "${APP_DIR}/backend/db/schema.sql" -q
sucesso "Tabelas criadas"

# ── 12. Criar usuário admin padrão ────────────────────────────────────────────
info "Criando usuário administrador padrão..."
ADMIN_HASH=$(node -e "const b=require('bcrypt');b.hash('admin123',12).then(h=>console.log(h));")
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -q -c \
  "INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES('Tabelião Admin','admin@cartorio.local','${ADMIN_HASH}','admin') ON CONFLICT DO NOTHING;"
sucesso "Usuário admin criado: admin@cartorio.local / admin123"

# ── 13. Configurar Nginx ──────────────────────────────────────────────────────
info "Configurando Nginx..."
cp "${SCRIPT_DIR}/nginx/cartorio.conf" /etc/nginx/sites-available/cartorio
ln -sf /etc/nginx/sites-available/cartorio /etc/nginx/sites-enabled/cartorio
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl restart nginx
sucesso "Nginx configurado"

# ── 14. Iniciar aplicação com PM2 ─────────────────────────────────────────────
info "Iniciando aplicação com PM2..."
cd "${APP_DIR}"
pm2 delete cartorio-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
sucesso "Aplicação iniciada"

# ── 15. Firewall ──────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  info "Configurando firewall..."
  ufw allow OpenSSH   -q
  ufw allow 'Nginx HTTP' -q
  ufw --force enable -q
  sucesso "Firewall configurado"
fi

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${VERDE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${VERDE}║       INSTALAÇÃO CONCLUÍDA COM SUCESSO!              ║${NC}"
echo -e "${VERDE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 URL:          ${AZUL}http://$(hostname -I | awk '{print $1}')${NC}"
echo -e "  👤 Login:        ${AZUL}admin@cartorio.local${NC}"
echo -e "  🔑 Senha:        ${AZUL}admin123${NC}"
echo ""
echo -e "  ${AMARELO}⚠️  IMPORTANTE: altere a senha do admin imediatamente após o primeiro login!${NC}"
echo ""
echo -e "  📁 Aplicação:    ${APP_DIR}"
echo -e "  📄 Logs:         ${LOG_DIR}"
echo -e "  🗄️  Banco:        postgresql://localhost/${DB_NAME}"
echo ""
echo -e "  Comandos úteis:"
echo -e "    pm2 status          — ver status da aplicação"
echo -e "    pm2 logs            — ver logs em tempo real"
echo -e "    pm2 restart cartorio-api — reiniciar"
echo ""
