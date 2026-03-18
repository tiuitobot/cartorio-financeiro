# Sistema de Gestão Financeira — Cartório de Notas

## Instalação no Servidor

### Pré-requisitos
- Ubuntu 22.04 LTS
- Acesso root (sudo)
- Conexão com a internet

### Passo a passo

**1. Copie a pasta `cartorio_server` para o servidor**

```bash
scp -r cartorio_server/ usuario@IP_DO_SERVIDOR:~/
```

**2. Execute o script de instalação**

```bash
cd ~/cartorio_server
sudo bash instalar.sh
```

O script instala e configura automaticamente:
- Node.js 20
- PostgreSQL 15
- Nginx
- PM2
- Banco de dados e tabelas
- Usuário administrador padrão
- Firewall (UFW)

**3. Acesse o sistema**

Abra o navegador no endereço IP do servidor. Ex: `http://192.168.1.100`

- **Login:** `admin@cartorio.local`
- **Senha:** `admin123`

> ⚠️ Altere a senha imediatamente após o primeiro acesso!

---

## Primeiro uso

### Cadastrar escreventes
1. Acesse **Escreventes → Novo Escrevente**
2. Informe nome, cargo, e-mail e taxa contratual (6%, 20% ou 30%)

### Criar usuários
1. Acesse **Usuários → Novo Usuário**
2. Vincule cada usuário do perfil *Escrevente* ao registro do escrevente correspondente

### Perfis disponíveis
| Perfil | Acesso |
|--------|--------|
| Admin (Tabelião) | Total |
| Chefe Financeiro | Financeiro completo |
| Financeiro | Registrar atos e pagamentos |
| Escrevente | Apenas seus atos |

---

## Manutenção

```bash
# Ver status da aplicação
pm2 status

# Ver logs em tempo real
pm2 logs

# Reiniciar após atualização
pm2 restart cartorio-api

# Backup do banco de dados
pg_dump -U cartorio_user cartorio > backup_$(date +%Y%m%d).sql
```

---

## Estrutura de pastas

```
cartorio_server/
├── backend/
│   ├── routes/         # Rotas da API
│   ├── middleware/     # Autenticação JWT
│   ├── db/             # Schema SQL
│   ├── db.js           # Pool PostgreSQL
│   ├── server.js       # Servidor Express
│   └── .env.example    # Modelo de configuração
├── frontend/
│   ├── src/
│   │   ├── App.jsx     # Interface React
│   │   ├── api.js      # Cliente da API
│   │   └── main.jsx    # Entry point
│   └── public/
│       └── logo.png    # Logo do cartório
├── nginx/
│   └── cartorio.conf   # Configuração Nginx
├── ecosystem.config.js # Configuração PM2
└── instalar.sh         # Script de instalação
```
