import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Ensures SSL / TLS parameters are present when connecting to cloud MySQL
 * like TiDB Cloud Serverless (which mandates sslaccept=strict).
 */
function formatDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return rawUrl;

  let url = rawUrl.trim();

  // If remote cloud database (e.g. tidbcloud, aiven, planetscale, etc.) and lacks SSL params:
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
  const hasSslAccept = url.includes('sslaccept=');
  const hasSsl = url.includes('ssl=') || url.includes('sslmode=') || url.includes('sslcert=');

  if (!isLocal && !hasSslAccept && !hasSsl) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sslaccept=strict`;
  }

  return url;
}

const formattedDbUrl = formatDatabaseUrl(process.env.DATABASE_URL);
if (formattedDbUrl && formattedDbUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = formattedDbUrl;
  console.log('🔒 Enhanced DATABASE_URL with sslaccept=strict for secure cloud transport.');
}

export const prisma = new PrismaClient(
  formattedDbUrl
    ? {
        datasources: {
          db: {
            url: formattedDbUrl
          }
        }
      }
    : undefined
);

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to MySQL database via Prisma');
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error);
  }
}
