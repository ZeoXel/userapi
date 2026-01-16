import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Supabase PostgreSQL 连接
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// 创建 PostgreSQL 连接 (Session Pooler 支持 prepared statements)
const client = postgres(connectionString, {
  ssl: 'require',
  connection: {
    options: '-c timezone=UTC',
  },
});

// 创建 Drizzle 实例
export const db = drizzle(client, { schema });

// 导出 schema
export * from './schema';
