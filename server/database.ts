import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Isi DATABASE_URL sebelum menjalankan aplikasi.');

export const pool = new Pool({ connectionString });
export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

export async function disconnectDatabase() {
  await prisma.$disconnect();
  await pool.end();
}
