import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@mirocola/shared';
import { connectDB, prisma } from './config/db.js';
import { setupSocketHandlers } from './services/socketHandler.js';
import { RoomManager } from './services/roomManager.js';
import { authRouter } from './routes/authRoutes.js';
import { playlistRouter } from './routes/playlistRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true
  })
);
app.use(express.json());

// Socket.io initialization with CORS
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Auth & Profile Routes
app.use('/api/auth', authRouter);
app.use('/api', authRouter);
app.use('/api/playlists', playlistRouter);

// REST Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'MiRocola Backend API',
    timestamp: new Date().toISOString()
  });
});

// Check if a room exists
app.get('/api/rooms/:code', async (req: Request, res: Response) => {
  const code = String(req.params.code).toUpperCase().trim();
  const roomManager = RoomManager.getInstance();
  const memoryRoom = roomManager.getRoom(code);

  if (memoryRoom) {
    return res.json({
      exists: true,
      active: true,
      code: memoryRoom.code,
      name: memoryRoom.name,
      usersCount: memoryRoom.users.length,
      mode: memoryRoom.mode
    });
  }

  // Check database for historic room
  try {
    const dbRoom = await prisma.room.findUnique({
      where: { code }
    });

    if (dbRoom) {
      return res.json({
        exists: true,
        active: false,
        code: dbRoom.code,
        name: dbRoom.name,
        hostName: dbRoom.hostName,
        createdAt: dbRoom.createdAt
      });
    }

    return res.status(404).json({ exists: false, error: 'Sala no encontrada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get song history of a room from MySQL
app.get('/api/rooms/:code/history', async (req: Request, res: Response) => {
  const code = String(req.params.code).toUpperCase().trim();

  try {
    const dbRoom = await prisma.room.findUnique({
      where: { code },
      include: {
        history: {
          orderBy: { playedAt: 'desc' },
          take: 50
        }
      }
    });

    if (!dbRoom) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    return res.json({
      room: {
        code: dbRoom.code,
        name: dbRoom.name,
        createdAt: dbRoom.createdAt
      },
      history: dbRoom.history
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Initialize real-time handlers
setupSocketHandlers(io);

// Start server
async function startServer() {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`
  🎵 =========================================
  🚀 MiRocola Backend Server Running!
  📡 HTTP & WebSockets on: http://localhost:${PORT}
  🗄️ Database: MySQL (mirocola_db)
  =========================================
    `);
  });
}

startServer();
