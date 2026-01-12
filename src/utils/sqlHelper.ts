import postgres from "postgres";
import config from "../utils/config";
import { ApiError } from "../utils/errors";

const sql = postgres({
  ...config.database,
  transform: {
    ...postgres.camel,
    undefined: null,
  },
});

export const executeQuery = async <T = any>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> => {
  try {
    const result = await sql.unsafe(
      query.replace(/@(\w+)\b/g, "$1"),
      Object.values(params)
    );

    return result as unknown as T[];
  } catch (err: any) {
    console.error("Query failed:", err);
    throw new ApiError(err.code, `Database query failed: ${err.message}`);
  }
};

export const transaction = async (callback: (sql: any) => Promise<any>) => {
  return await sql.begin(async (tx) => {
    return await callback(tx);
  });
};

export const closePool = async () => {
  await sql.end();
};

export { sql };
