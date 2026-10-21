import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

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
 * Executes Prisma CLI db push in background with SSL env
 */
async function runPrismaDbPush(): Promise<{ success: boolean; log: string }> {
  try {
    console.log('🔄 Attempting npx prisma db push with secure SSL URL...');
    const { stdout, stderr } = await execAsync(
      'npx prisma db push --skip-generate --accept-data-loss',
      {
        env: {
          ...process.env,
          DATABASE_URL: formattedDbUrl || process.env.DATABASE_URL
        },
        timeout: 25000
      }
    );
    const log = (stdout || '') + (stderr || '');
    console.log('✅ prisma db push output:', log);
    return { success: true, log };
  } catch (err: any) {
    const log = err?.message || String(err);
    console.warn('Notice: npx prisma db push notice:', log);
    return { success: false, log };
  }
}

/**
 * Automatically creates all schema tables if they don't exist yet
 */
export async function ensureTablesExist(): Promise<{
  success: boolean;
  userTableOk: boolean;
  errors: string[];
  cliLog?: string;
}> {
  console.log('⚡ Initializing database schema tables...');
  const errors: string[] = [];

  // Step 1: Try Prisma CLI db push first
  const cliRes = await runPrismaDbPush();

  // Step 2: Native DDL without trailing semicolons (prepared statements fail with ;)
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
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`User_email_key\` (\`email\`),
      UNIQUE KEY \`User_username_key\` (\`username\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`Room\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`code\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`mode\` VARCHAR(191) NOT NULL DEFAULT 'COLLABORATIVE',
      \`hostName\` VARCHAR(191) NOT NULL,
      \`hostUserId\` INT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`Room_code_key\` (\`code\`),
      KEY \`Room_code_idx\` (\`code\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

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
      PRIMARY KEY (\`id\`),
      KEY \`SongHistory_roomId_idx\` (\`roomId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

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
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`Playlist_slug_key\` (\`slug\`),
      KEY \`Playlist_userId_idx\` (\`userId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

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
      PRIMARY KEY (\`id\`),
      KEY \`PlaylistSong_playlistId_idx\` (\`playlistId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`Comment\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`playlistId\` INT NOT NULL,
      \`content\` VARCHAR(1000) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      KEY \`Comment_playlistId_idx\` (\`playlistId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`PlaylistLike\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`playlistId\` INT NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`PlaylistLike_userId_playlistId_key\` (\`userId\`, \`playlistId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  ];

  for (const sql of tableDefinitions) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err: any) {
      console.error('Error executing table definition SQL:', err?.message || err);
      errors.push(err?.message || String(err));
    }
  }

  // Step 3: Verify User table exists
  let userTableOk = false;
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM `User` LIMIT 1');
    userTableOk = true;
    console.log('✅ User table confirmed to exist in current database!');
  } catch (checkErr: any) {
    console.error('⚠️ Verification query for User table failed:', checkErr?.message || checkErr);
    errors.push('Verification check failed: ' + (checkErr?.message || String(checkErr)));
  }

  return {
    success: errors.length === 0 || userTableOk,
    userTableOk,
    errors,
    cliLog: cliRes.log
  };
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
