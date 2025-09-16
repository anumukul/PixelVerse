// frontend/src/services/websocket.ts
export interface UserCursor {
  userId: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export interface RealtimePixelUpdate {
  x: number;
  y: number;
  color: string;
  owner: string;
  timestamp: number;
  txHash?: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private userCursors: Map<string, UserCursor> = new Map();

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.emit('connection', { status: 'disconnected' });
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'pixel_painted':
        this.emit('pixelUpdate', data.payload as RealtimePixelUpdate);
        break;
      
      case 'cursor_moved':
        const cursor = data.payload as UserCursor;
        this.userCursors.set(cursor.userId, cursor);
        this.emit('cursorUpdate', cursor);
        break;
      
      case 'user_joined':
        this.emit('userJoined', data.payload);
        break;
      
      case 'user_left':
        this.userCursors.delete(data.payload.userId);
        this.emit('userLeft', data.payload);
        break;
      
      case 'canvas_stats':
        this.emit('statsUpdate', data.payload);
        break;

      case 'batch_pixels':
        this.emit('batchUpdate', data.payload);
        break;
    }
  }

  // Send pixel update to other users
  sendPixelUpdate(x: number, y: number, color: string, txHash?: string) {
    this.send('pixel_painted', {
      x, y, color, txHash,
      timestamp: Date.now()
    });
  }

  // Send cursor position to other users
  sendCursorUpdate(x: number, y: number, color: string) {
    const cursor: UserCursor = {
      userId: this.getUserId(),
      x, y, color,
      timestamp: Date.now()
    };
    
    this.send('cursor_moved', cursor);
  }

  // Join a specific canvas region for focused updates
  joinRegion(startX: number, startY: number, width: number, height: number) {
    this.send('join_region', { startX, startY, width, height });
  }

  private send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }

  getUserCursors(): Map<string, UserCursor> {
    return this.userCursors;
  }

  private getUserId(): string {
    // Use wallet address or generate unique session ID
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}