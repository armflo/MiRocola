import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@mirocola/shared';

// Determine backend URL (dynamically or fallback to port 3001)
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(BACKEND_URL, {
  autoConnect: true, // Pre-connect in background as soon as page loads
  transports: ['websocket', 'polling'], // Prioritize direct fast WebSocket
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000
});

/**
 * Pre-warms the backend on Render free tier (which hibernates after 15m inactivity)
 */
export function wakeUpBackend(): void {
  try {
    fetch(`${BACKEND_URL}/api/health`, { mode: 'cors' }).catch(() => {});
    if (!socket.connected) {
      socket.connect();
    }
  } catch {
    // Ignore offline errors
  }
}
