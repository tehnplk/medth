import mysql from "mysql2/promise";

const globalForMysql = globalThis as unknown as {
  __mysqlPool?: mysql.Pool;
};

export function getPool() {
  if (globalForMysql.__mysqlPool) return globalForMysql.__mysqlPool;

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    timezone: "+07:00",
    dateStrings: true,
  });

  globalForMysql.__mysqlPool = pool;
  return pool;
}

export async function query<T>(sql: string, params: unknown[] = []) {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}
