module.exports = {
  apps: [
    {
      name: 'trackwe-frontend',
      cwd: '/var/www/trackwe',
      script: './node_modules/.bin/serve',
      args: '-s out -l 3000',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 2000,
      max_restarts: 50
    },
    {
      name: 'trackwe-tracker',
      cwd: '/var/www/trackwe',
      script: './node_modules/.bin/tsx',
      args: 'tracker-service/src/index.ts',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 2000,
      max_restarts: 50
    }
  ]
};
