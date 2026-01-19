import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Supabase PostgreSQL 连接
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// 创建 PostgreSQL 连接 (Serverless + Supabase Pooler)
const client = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false, // 兼容 Supabase Transaction Pooler
});

// 创建 Drizzle 实例
export const db = drizzle(client, { schema });

// 导出 schema
export * from './schema';
