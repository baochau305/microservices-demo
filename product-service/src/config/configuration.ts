export default () => ({
  logLevel: process.env.LOG_LEVEL || 'info',
  grpcUrl: process.env.GRPC_URL || '0.0.0.0:50052',
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgres://postgres:postgres@localhost:5432/productdb',
  },
});
