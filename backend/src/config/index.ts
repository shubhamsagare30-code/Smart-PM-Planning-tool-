export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DB_PATH || './data/capacity.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
