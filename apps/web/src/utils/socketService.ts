import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      console.warn('Socket connection aborted: Access token missing');
      return;
    }

    // Extract socket URL from VITE_API_URL or default to localhost
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    let socketUrl = 'http://localhost:5000';
    try {
      socketUrl = new URL(apiUrl).origin;
    } catch (err) {
      // Fallback if URL is relative or invalid
      socketUrl = window.location.origin;
    }

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO successfully connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected. Reason:', reason);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    if (!this.socket) {
      this.connect();
    }
    return this.socket;
  }

  emit(event: string, data: any, callback?: (res: any) => void) {
    const socket = this.getSocket();
    if (!socket) return;
    socket.emit(event, data, callback);
  }

  on(event: string, callback: (...args: any[]) => void) {
    const socket = this.getSocket();
    if (!socket) return;
    socket.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }
}

export const socketService = new SocketService();
export default socketService;
