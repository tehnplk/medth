import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    idleTimeout: 60_000,
    timezone: "+07:00",
    dateStrings: true,
  });

  return pool;
}

export async function query<T>(sql: string, params: unknown[] = []) {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}
