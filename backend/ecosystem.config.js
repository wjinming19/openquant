module.exports = {
  apps: [{
    name: 'openquant-backend',
    script: './start.sh',
    cwd: '/root/.openclaw/workspace/openquant/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    log_file: '/var/log/openquant/combined.log',
    out_file: '/var/log/openquant/out.log',
    error_file: '/var/log/openquant/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
