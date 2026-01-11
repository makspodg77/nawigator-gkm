import postgres from "postgres";
import config from "../utils/config";
import { ApiError } from "../utils/errors";

// 1. Initialize the connection (Postgres.js handles the pool automatically)
const sql = postgres({
  ...config.database,
  transform: {
    ...postgres.camel, // Automatically converts stop_id to stopId
    undefined: null,
  },
});

/**
 * Execute Query - The modern way
 */
export const executeQuery = async <T = any>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> => {
  try {
    // We use a "tagged template" approach or the helper for dynamic queries
    // To keep your EXACT @key logic, we use the postgres dynamic helper:
    const result = await sql.unsafe(
      query.replace(/@(\w+)\b/g, "$1"), // Convert @key to $1 (postgres.js uses raw names)
      Object.values(params)
    );

    return result as unknown as T[];
  } catch (err: any) {
    console.error("💅 Query failed:", err);
    throw new ApiError(err.code, `Database query failed: ${err.message}`);
  }
};

/**
 * Transactions in postgres.js are iconic—no manual COMMIT/ROLLBACK needed.
 * If the function throws, it rollbacks. If it finishes, it commits.
 */
export const transaction = async (callback: (sql: any) => Promise<any>) => {
  return await sql.begin(async (tx) => {
    return await callback(tx);
  });
};

export const closePool = async () => {
  await sql.end();
};

export { sql };
