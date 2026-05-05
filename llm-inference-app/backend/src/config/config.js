require('dotenv').config();
module.exports = {
  server: { port: 3000, nodeEnv: 'development' },
  jwt: {
    secret: 'supersecretkey123',
    expiration: '24h',
    refreshSecret: 'supersecretrefresh123',
    refreshExpiration: '7d'
  },
  api: { baseUrl: '/api/v1', version: 'v1' },
  cors: { origin: true, credentials: true }
};
