module.exports = {
  apps: [{
    name: 'space-ws',
    cwd: '/var/www/html/MyPlatform',
    script: 'dist-server/websocket.js',
    interpreter: '/usr/bin/node',
    node_args: '--env-file=/etc/space/space.env',
    exec_mode: 'fork', instances: 1,
    autorestart: true, watch: false,
    restart_delay: 3000, min_uptime: '10s', max_restarts: 10,
    kill_timeout: 5000, time: true,
    env: { NODE_ENV: 'production', WS_PORT: '5050' }
  }]
};
