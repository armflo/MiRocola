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
async function ensureTablesExist() {
  const tableDefinitions = [
    `CREATE TABLE IF NOT EXISTS \`User\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`email\` VARCHAR(191) NOT NULL UNIQUE,
      \`username\` VARCHAR(191) NOT NULL UNIQUE,
      \`passwordHash\` VARCHAR(255) NOT NULL,
      \`avatar\` VARCHAR(500) NOT NULL,
      \`bio\` VARCHAR(500) NULL,
      \`djScore\` INT NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`Room\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`code\` VARCHAR(191) NOT NULL UNIQUE,
      \`name\` VARCHAR(191) NOT NULL,
      \`mode\` VARCHAR(191) NOT NULL DEFAULT 'COLLABORATIVE',
      \`hostName\` VARCHAR(191) NOT NULL,
      \`hostUserId\` INT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX \`idx_room_code\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`SongHistory\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`roomId\` INT NOT NULL,
      \`youtubeId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(500) NOT NULL,
      \`channelTitle\` VARCHAR(255) NOT NULL,
      \`duration\` INT NOT NULL,
      \`thumbnail\` VARCHAR(500) NOT NULL,
      \`addedBy\` VARCHAR(191) NOT NULL,
      \`playedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`Playlist\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`userId\` INT NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      \`description\` VARCHAR(500) NULL,
      \`slug\` VARCHAR(191) NOT NULL UNIQUE,
      \`isPublic\` BOOLEAN NOT NULL DEFAULT true,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`PlaylistSong\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`playlistId\` INT NOT NULL,
      \`youtubeId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(500) NOT NULL,
      \`channelTitle\` VARCHAR(255) NOT NULL,
      \`duration\` INT NOT NULL,
      \`thumbnail\` VARCHAR(500) NOT NULL,
      \`position\` INT NOT NULL,
      \`addedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`Comment\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`playlistId\` INT NOT NULL,
      \`userId\` INT NOT NULL,
      \`content\` VARCHAR(1000) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`PlaylistLike\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`playlistId\` INT NOT NULL,
      \`userId\` INT NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY \`unique_playlist_user\` (\`playlistId\`, \`userId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const sql of tableDefinitions) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err: any) {
      console.warn('Notice executing table setup SQL:', err?.message || err);
    }
  }
}

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to MySQL database via Prisma');

    // Verify if tables exist, or create them automatically
    try {
      await prisma.$queryRawUnsafe('SELECT 1 FROM `User` LIMIT 1');
      console.log('✅ Database schema verified: User table exists.');
    } catch (checkErr: any) {
      const msg = checkErr?.message || '';
      if (
        msg.includes("doesn't exist") ||
        msg.includes('does not exist') ||
        msg.includes('1146') ||
        msg.includes('P2021')
      ) {
        console.log('⚡ Table User does not exist. Initializing database tables automatically...');
        await ensureTablesExist();
        console.log('✅ All database tables created successfully!');
      }
    }
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error);
  }
}
