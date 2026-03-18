module.exports = {
  apps: [{
    name: 'cartorio-api',
    script: './backend/server.js',
    cwd: '/var/www/cartorio',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/var/log/cartorio/combined.log',
    out_file: '/var/log/cartorio/out.log',
    error_file: '/var/log/cartorio/error.log',
    time: true
  }]
};
