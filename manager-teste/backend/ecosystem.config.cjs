module.exports = {
  apps: [
    {
      name: 'manager-group-backend',
      script: './build/bin/server.js',
      instances: 'max', // Ou um número específico de instâncias
      exec_mode: 'cluster', // Melhora a performance e o reload
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};