import mysql from "mysql2/promise";

/**
 * Minimal shape the lib/ query functions depend on — deliberately narrower
 * than mysql2's full Pool type so tests can pass a lightweight fake instead
 * of mocking mysql2 itself.
 */
export interface Queryable {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<[T[], unknown]>;
}

let pool: mysql.Pool | undefined;

/** Lazily-created singleton pool — one per server process, reused across requests. */
export function getPool(): Queryable {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "timetable_app",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "timetable",
      waitForConnections: true,
      connectionLimit: 5,
      charset: "utf8mb4_general_ci",
    });
  }
  return pool as unknown as Queryable;
}
