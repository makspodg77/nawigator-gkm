function getSslOptions() {
  const sslMode = (process.env.PGSSLMODE || "disable").toLowerCase();

  switch (sslMode) {
    case "disable":
      return false;
    case "require":
      return { rejectUnauthorized: false };
    case "verify-ca":
    case "verify-full":
      return { rejectUnauthorized: true };
    default:
      return { rejectUnauthorized: false };
  }
}

const config = {
  database: {
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: getSslOptions(),
    options: "-c timezone=Europe/Warsaw",
  },
} as const;

export default config;
