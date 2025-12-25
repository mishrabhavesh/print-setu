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
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private connectionPromise: Promise<void> | null = null;
  private enableLogging: boolean;
  private defaultTimeout: number;

  constructor(config: PrinterConfig) {
    this.url = config.url || DEFAULT_WS_URL;
    this.maxReconnectAttempts = config.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
    this.reconnectDelay = config.reconnectDelay || DEFAULT_RECONNECT_DELAY;
    this.enableLogging = config.enableLogging ?? true;
    this.defaultTimeout = 10000; // 10 seconds default timeout
  }

  private log(message: string, ...args: any[]): void {
    if (this.enableLogging) {
      console.log(`[PrinterSDK] ${message}`, ...args);
    }
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          this.log('Connected to printer service');
          this.reconnectAttempts = 0;

          this.send({
            type: 'AUTH',
          }).then(() => {
            // Wait a bit for auth to process
            setTimeout(() => {
              this.connectionPromise = null;
              resolve();
            }, 100);
          }).catch(reject);
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.log('Received message:', data);
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
      this.messageHandlers.set(type, new Set<MessageHandler>());
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

    // Also trigger generic 'message' event for all messages
    const allHandlers = this.messageHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach((handler) => handler(data));
    }
  }

  private async send(message: PrinterMessage): Promise<void> {
    await this.connect();

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      this.log('Sent message:', message);
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  private waitForResponse<T>(
    responseType: string,
    errorType?: string,
    timeout: number = this.defaultTimeout
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let cleanupSuccess: () => void;
      let cleanupError: () => void = () => { };

      const timeoutId = setTimeout(() => {
        cleanupSuccess();
        cleanupError();
        reject(new Error(`Request timeout: No response received for ${responseType}`));
      }, timeout);

      // Set up success listener
      cleanupSuccess = this.on(responseType, (data) => {
        this.log(`Response received for ${responseType}:`, data);
        clearTimeout(timeoutId);
        cleanupSuccess();
        cleanupError();

        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.payload as T);
        }
      });

      // Set up error listener if provided
      if (errorType) {
        cleanupError = this.on(errorType, (data) => {
          this.log(`Error received for ${errorType}:`, data);
          clearTimeout(timeoutId);
          cleanupSuccess();
          cleanupError();
          reject(new Error(data.payload?.message || data.error || 'Operation failed'));
        });
      }
    });
  }

  async scanPrinters(): Promise<PrinterDevice[]> {
    // Set up listener BEFORE sending message
    const responsePromise = this.waitForResponse<{ printers: PrinterDevice[] }>(
      'PRINTERS_FOUND',
      'SCAN_ERROR'
    );

    // Now send the request
    await this.send({
      type: MESSAGE_TYPES.SEARCH_USB_PRINTERS,
    });

    const response = await responsePromise;
    return response.printers || [];
  }

  async connectPrinter(printerId: string): Promise<{ success: boolean; message?: string }> {
    // Set up listener BEFORE sending message
    const responsePromise = this.waitForResponse<{ success: boolean; message?: string }>(
      'PRINTER_CONNECTED',
      'PRINTER_CONNECT_ERROR'
    );

    await this.send({
      type: MESSAGE_TYPES.CONNECT_PRINTER,
      payload: { printerId },
    });

    return await responsePromise;
  }

  async disconnectPrinter(printerId: string): Promise<{ success: boolean; message?: string }> {
    // Set up listener BEFORE sending message
    const responsePromise = this.waitForResponse<{ success: boolean; message?: string }>(
      'PRINTER_DISCONNECTED',
      'PRINTER_DISCONNECT_ERROR'
    );

    await this.send({
      type: MESSAGE_TYPES.DISCONNECT_PRINTER,
      payload: { printerId },
    });

    return await responsePromise;
  }

  async print(
    printerId: string,
    base64Data: string,
    options?: PrintOptions
  ): Promise<{ success: boolean; jobId?: string; message?: string }> {
    // Set up listener BEFORE sending message
    const responsePromise = this.waitForResponse<{ success: boolean; jobId?: string; message?: string }>(
      'PRINT_SUCCESS',
      'PRINT_ERROR'
    );

    await this.send({
      type: MESSAGE_TYPES.PRINT_DATA,
      payload: {
        printerId,
        data: base64Data,
        ...options,
      },
    });

    return await responsePromise;
  }

  async ping(timeout = 3000): Promise<boolean> {
    const responsePromise = this.waitForResponse<null>(
      MESSAGE_TYPES.PONG,
      undefined,
      timeout
    );

    await this.send({ type: MESSAGE_TYPES.PING });

    await responsePromise;
    return true;
  }


  async getState(): Promise<any> {
    // Set up listener BEFORE sending message
    const responsePromise = this.waitForResponse<any>(
      'STATE_RESPONSE',
      'STATE_ERROR'
    );

    await this.send({
      type: MESSAGE_TYPES.GET_STATE,
    });

    return await responsePromise;
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
