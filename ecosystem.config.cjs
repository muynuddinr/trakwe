module.exports = {
  apps: [
    {
      name: 'trackwe-frontend',
      cwd: '/var/www/trackwe',
      script: './node_modules/.bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      restart_delay: 2000,
      max_restarts: 50
    },
    {
      name: 'trackwe-tracker',
      cwd: '/var/www/trackwe',
      script: 'node',
      args: 'scripts/fmc920-service.mjs',
      env: {
        NODE_ENV: 'production',
        GPS_TCP_HOST: '0.0.0.0',
        GPS_TCP_PORT: 5027
      },
      restart_delay: 2000,
      max_restarts: 50
    }
  ]
};
