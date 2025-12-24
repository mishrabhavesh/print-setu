import {
  PrinterConfig,
  PrinterDevice,
  PrinterMessage,
  MessageHandler,
  PrintOptions,
} from './types';
import {
  DEFAULT_WS_URL,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  DEFAULT_RECONNECT_DELAY,
  MESSAGE_TYPES,
} from './constants';

export class PrinterService {
  private socket: WebSocket | null = null;
  private url: string;
  private apiKey: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private messageHandlers = new Map>();
  private connectionPromise: Promise | null = null;
  private enableLogging: boolean;

  constructor(config: PrinterConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;
    this.url = config.url || DEFAULT_WS_URL;
    this.maxReconnectAttempts = config.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
    this.reconnectDelay = config.reconnectDelay || DEFAULT_RECONNECT_DELAY;
    this.enableLogging = config.enableLogging ?? true;
  }

  private log(message: string, ...args: any[]): void {
    if (this.enableLogging) {
      console.log(`[PrinterSDK] ${message}`, ...args);
    }
  }

  async connect(): Promise {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          this.log('Connected to printer service');
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          
          // Authenticate with API key
          this.send({
            type: 'AUTH',
            payload: { apiKey: this.apiKey },
          });
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connectionPromise = null;
          reject(error);
        };

        this.socket.onclose = () => {
          this.log('Disconnected from printer service');
          this.connectionPromise = null;
          this.attemptReconnect();
        };
      } catch (err) {
        this.connectionPromise = null;
        reject(err);
      }
    });

    return this.connectionPromise;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        this.connect().catch((err) =>
          console.error('Reconnection failed:', err)
        );
      }, this.reconnectDelay);
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  private handleMessage(data: any): void {
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  private async send(message: PrinterMessage): Promise {
    await this.connect();

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  async scanPrinters(): Promise {
    return this.send({
      type: MESSAGE_TYPES.SEARCH_USB_PRINTERS,
    });
  }

  async connectPrinter(printerId: string): Promise {
    return this.send({
      type: MESSAGE_TYPES.CONNECT_PRINTER,
      payload: { printerId },
    });
  }

  async disconnectPrinter(printerId: string): Promise {
    return this.send({
      type: MESSAGE_TYPES.DISCONNECT_PRINTER,
      payload: { printerId },
    });
  }

  async print(
    printerId: string,
    base64Data: string,
    options?: PrintOptions
  ): Promise {
    return this.send({
      type: MESSAGE_TYPES.PRINT_DATA,
      payload: {
        printerId,
        data: base64Data,
        ...options,
      },
    });
  }

  async getState(): Promise {
    return this.send({
      type: MESSAGE_TYPES.GET_STATE,
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageHandlers.clear();
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
