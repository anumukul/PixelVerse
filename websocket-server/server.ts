// websocket-server/server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

interface ConnectedUser {
  id: string;
  ws: WebSocket;
  address?: string;
  lastSeen: number;
  cursor?: { x: number; y: number; color: string };
}

interface PixelUpdate {
  x: number;
  y: number;
  color: string;
  owner: string;
  timestamp: number;
  txHash?: string;
}

class PixelVerseWebSocketServer {
  private wss: WebSocketServer;
  private server: any;
  private users = new Map<string, ConnectedUser>();
  private pixelHistory: PixelUpdate[] = [];
  private statsInterval?: NodeJS.Timeout;

  constructor(port: number = 3001) {
    // Create HTTP server with Express
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        activeUsers: this.users.size,
        totalPixels: this.pixelHistory.length,
        uptime: process.uptime()
      });
    });

    // API endpoint for canvas data
    app.get('/api/canvas-data', (req, res) => {
      const recentPixels = this.pixelHistory.slice(-1000); // Last 1000 pixels
      res.json({
        pixels: recentPixels,
        activeUsers: this.users.size,
        stats: this.getCanvasStats()
      });
    });

    this.server = createServer(app);
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });

    this.setupWebSocketHandlers();
    this.startStatsUpdates();

    this.server.listen(port, () => {
      console.log(`🚀 PixelVerse WebSocket Server running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🔗 WebSocket: ws://localhost:${port}/ws`);
    });
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const userId = this.generateUserId();
      const user: ConnectedUser = {
        id: userId,
        ws,
        lastSeen: Date.now()
      };

      this.users.set(userId, user);
      console.log(`👋 User ${userId} connected. Total users: ${this.users.size}`);

      // Send welcome message with current stats
      this.sendToUser(userId, 'welcome', {
        userId,
        activeUsers: this.users.size,
        recentPixels: this.pixelHistory.slice(-50) // Send last 50 pixels
      });

      // Broadcast user joined
      this.broadcast('user_joined', {
        userId,
        timestamp: Date.now()
      }, userId);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(userId, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`👋 User ${userId} disconnected`);
        this.users.delete(userId);
        
        this.broadcast('user_left', {
          userId,
          timestamp: Date.now()
        });
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        this.users.delete(userId);
      });

      // Update last seen on pong
      ws.on('pong', () => {
        const user = this.users.get(userId);
        if (user) {
          user.lastSeen = Date.now();
        }
      });
    });

    // Cleanup inactive connections
    setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      this.users.forEach((user, userId) => {
        if (now - user.lastSeen > timeout) {
          console.log(`⚠️ Removing inactive user ${userId}`);
          user.ws.terminate();
          this.users.delete(userId);
        } else {
          // Send ping to keep connection alive
          try {
            user.ws.ping();
          } catch (error) {
            console.error(`Failed to ping user ${userId}:`, error);
            this.users.delete(userId);
          }
        }
      });
    }, 15000); // Check every 15 seconds
  }

  private handleMessage(userId: string, message: any) {
    const user = this.users.get(userId);
    if (!user) return;

    user.lastSeen = Date.now();

    switch (message.type) {
      case 'identify':
        user.address = message.payload.address;
        console.log(`🔍 User ${userId} identified as ${message.payload.address}`);
        break;

      case 'pixel_painted':
        this.handlePixelPainted(userId, message.payload);
        break;

      case 'cursor_moved':
        this.handleCursorMoved(userId, message.payload);
        break;

      case 'join_region':
        this.handleJoinRegion(userId, message.payload);
        break;

      case 'request_canvas_data':
        this.sendCanvasData(userId);
        break;

      default:
        console.log(`❓ Unknown message type: ${message.type}`);
    }
  }

  private handlePixelPainted(userId: string, payload: any) {
    const pixelUpdate: PixelUpdate = {
      x: payload.x,
      y: payload.y,
      color: payload.color,
      owner: payload.owner || 'unknown',
      timestamp: payload.timestamp || Date.now(),
      txHash: payload.txHash
    };

    // Add to history
    this.pixelHistory.push(pixelUpdate);
    
    // Keep only recent history (last 10,000 pixels)
    if (this.pixelHistory.length > 10000) {
      this.pixelHistory = this.pixelHistory.slice(-10000);
    }

    console.log(`🎨 Pixel painted at (${pixelUpdate.x}, ${pixelUpdate.y}) by ${pixelUpdate.owner}`);

    // Broadcast to all users except sender
    this.broadcast('pixel_painted', pixelUpdate, userId);
  }

  private handleCursorMoved(userId: string, payload: any) {
    const user = this.users.get(userId);
    if (!user) return;

    user.cursor = {
      x: payload.x,
      y: payload.y,
      color: payload.color
    };

    // Broadcast cursor position to nearby users
    this.broadcast('cursor_moved', {
      userId,
      x: payload.x,
      y: payload.y,
      color: payload.color,
      timestamp: Date.now()
    }, userId);
  }

  private handleJoinRegion(userId: string, payload: any) {
    // Send pixels in the specified region
    const { startX, startY, width, height } = payload;
    
    const regionPixels = this.pixelHistory.filter(pixel => 
      pixel.x >= startX && pixel.x < startX + width &&
      pixel.y >= startY && pixel.y < startY + height
    );

    this.sendToUser(userId, 'region_data', {
      startX, startY, width, height,
      pixels: regionPixels
    });
  }

  private sendCanvasData(userId: string) {
    this.sendToUser(userId, 'canvas_data', {
      pixels: this.pixelHistory.slice(-1000), // Last 1000 pixels
      activeUsers: this.users.size,
      stats: this.getCanvasStats()
    });
  }

  private broadcast(type: string, payload: any, excludeUserId?: string) {
    const message = JSON.stringify({ type, payload });
    
    this.users.forEach((user, userId) => {
      if (userId !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
        try {
          user.ws.send(message);
        } catch (error) {
          console.error(`Failed to send to user ${userId}:`, error);
          this.users.delete(userId);
        }
      }
    });
  }

  private sendToUser(userId: string, type: string, payload: any) {
    const user = this.users.get(userId);
    if (!user || user.ws.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({ type, payload });
    
    try {
      user.ws.send(message);
    } catch (error) {
      console.error(`Failed to send to user ${userId}:`, error);
      this.users.delete(userId);
    }
  }

  private startStatsUpdates() {
    this.statsInterval = setInterval(() => {
      const stats = this.getCanvasStats();
      
      this.broadcast('canvas_stats', {
        ...stats,
        timestamp: Date.now()
      });
    }, 5000); // Update every 5 seconds
  }

  private getCanvasStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const recentPixels = this.pixelHistory.filter(p => p.timestamp > oneMinuteAgo);
    const hourlyPixels = this.pixelHistory.filter(p => p.timestamp > oneHourAgo);

    const uniqueArtists = new Set(this.pixelHistory.map(p => p.owner)).size;
    const pixelsPerSecond = recentPixels.length / 60;

    return {
      activeUsers: this.users.size,
      totalPixels: this.pixelHistory.length,
      uniqueArtists,
      pixelsPerSecond: Math.round(pixelsPerSecond * 100) / 100,
      recentPixels: recentPixels.length,
      hourlyPixels: hourlyPixels.length
    };
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public stop() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.wss.close(() => {
      console.log('WebSocket server closed');
    });

    this.server.close(() => {
      console.log('HTTP server closed');
    });
  }
}

// Start server
const server = new PixelVerseWebSocketServer(3001);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.stop();
  process.exit(0);
});

export default PixelVerseWebSocketServer;