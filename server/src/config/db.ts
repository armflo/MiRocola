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

/**
 * Automatically creates all schema tables if they don't exist yet
 */
export async function ensureTablesExist(): Promise<{ success: boolean; errors: string[] }> {
  console.log('⚡ Initializing database schema tables if not present...');
  const errors: string[] = [];

  const tableDefinitions = [
    `CREATE TABLE IF NOT EXISTS \`User\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`email\` VARCHAR(191) NOT NULL,
      \`username\` VARCHAR(191) NOT NULL,
      \`passwordHash\` VARCHAR(191) NOT NULL,
      \`avatar\` VARCHAR(500) NOT NULL,
      \`bio\` VARCHAR(500) NULL,
      \`djScore\` INT NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`User_email_key\` (\`email\`),
      UNIQUE INDEX \`User_username_key\` (\`username\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`Room\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`code\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`mode\` VARCHAR(191) NOT NULL DEFAULT 'COLLABORATIVE',
      \`hostName\` VARCHAR(191) NOT NULL,
      \`hostUserId\` INT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`Room_code_key\` (\`code\`),
      INDEX \`Room_code_idx\` (\`code\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`SongHistory\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`roomId\` INT NOT NULL,
      \`youtubeId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(500) NOT NULL,
      \`channelTitle\` VARCHAR(255) NOT NULL,
      \`duration\` INT NOT NULL,
      \`thumbnail\` VARCHAR(500) NOT NULL,
      \`addedBy\` VARCHAR(191) NOT NULL,
      \`addedByUserId\` INT NULL,
      \`playedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`SongHistory_roomId_idx\` (\`roomId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`Playlist\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`description\` VARCHAR(1000) NULL,
      \`slug\` VARCHAR(191) NOT NULL,
      \`isPublic\` BOOLEAN NOT NULL DEFAULT true,
      \`likesCount\` INT NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`Playlist_slug_key\` (\`slug\`),
      INDEX \`Playlist_userId_idx\` (\`userId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`PlaylistSong\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`playlistId\` INT NOT NULL,
      \`youtubeId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(500) NOT NULL,
      \`channelTitle\` VARCHAR(255) NOT NULL,
      \`duration\` INT NOT NULL,
      \`thumbnail\` VARCHAR(500) NOT NULL,
      \`orderIndex\` INT NOT NULL DEFAULT 0,
      \`addedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`PlaylistSong_playlistId_idx\` (\`playlistId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`Comment\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`playlistId\` INT NOT NULL,
      \`content\` VARCHAR(1000) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`Comment_playlistId_idx\` (\`playlistId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`PlaylistLike\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`playlistId\` INT NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`PlaylistLike_userId_playlistId_key\` (\`userId\`, \`playlistId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  ];

  for (const sql of tableDefinitions) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err: any) {
      console.error('Error executing table definition SQL:', err?.message || err);
      errors.push(err?.message || String(err));
    }
  }

  return { success: errors.length === 0, errors };
}

/**
 * Resilient wrapper: If a table is missing, auto-provisions schema and retries once
 */
export async function withAutoTableRecovery<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (err: any) {
    const msg = err?.message || '';
    if (
      msg.includes("doesn't exist") ||
      msg.includes('does not exist') ||
      msg.includes('1146') ||
      msg.includes('P2021') ||
      err?.code === 'P2021'
    ) {
      console.log('⚡ Missing table detected during query. Auto-provisioning tables...');
      await ensureTablesExist();
      // Retry once after provisioning
      return await action();
    }
    throw err;
  }
}

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to MySQL database via Prisma');

    // Run table initialization unconditionally to guarantee all tables exist
    await ensureTablesExist();
    console.log('✅ Database schema verified and tables ensured.');
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database during startup:', error);
  }
}
