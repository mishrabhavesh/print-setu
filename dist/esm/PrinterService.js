import { DEFAULT_WS_URL, DEFAULT_MAX_RECONNECT_ATTEMPTS, DEFAULT_RECONNECT_DELAY, MESSAGE_TYPES, } from './constants';
export class PrinterService {
    constructor(config) {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.messageHandlers = new Map();
        this.connectionPromise = null;
        this.url = config.url || DEFAULT_WS_URL;
        this.maxReconnectAttempts = config.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = config.reconnectDelay || DEFAULT_RECONNECT_DELAY;
        this.enableLogging = config.enableLogging ?? true;
        this.defaultTimeout = 10000; // 10 seconds default timeout
    }
    log(message, ...args) {
        if (this.enableLogging) {
            console.log(`[PrinterSDK] ${message}`, ...args);
        }
    }
    async connect() {
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
                    }
                    catch (err) {
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
            }
            catch (err) {
                this.connectionPromise = null;
                reject(err);
            }
        });
        return this.connectionPromise;
    }
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.connect().catch((err) => console.error('Reconnection failed:', err));
            }, this.reconnectDelay);
        }
    }
    on(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type).add(handler);
        return () => {
            const handlers = this.messageHandlers.get(type);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    }
    handleMessage(data) {
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
    async send(message) {
        await this.connect();
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            this.log('Sent message:', message);
        }
        else {
            throw new Error('WebSocket is not connected');
        }
    }
    waitForResponse(responseType, errorType, timeout = this.defaultTimeout) {
        return new Promise((resolve, reject) => {
            let cleanupSuccess;
            let cleanupError = () => { };
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
                }
                else {
                    resolve(data.payload);
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
    async scanPrinters() {
        // Set up listener BEFORE sending message
        const responsePromise = this.waitForResponse('PRINTERS_FOUND', 'SCAN_ERROR');
        // Now send the request
        await this.send({
            type: MESSAGE_TYPES.SEARCH_USB_PRINTERS,
        });
        const response = await responsePromise;
        return response.printers || [];
    }
    async connectPrinter(printerId) {
        // Set up listener BEFORE sending message
        const responsePromise = this.waitForResponse('PRINTER_CONNECTED', 'PRINTER_CONNECT_ERROR');
        await this.send({
            type: MESSAGE_TYPES.CONNECT_PRINTER,
            payload: { printerId },
        });
        return await responsePromise;
    }
    async disconnectPrinter(printerId) {
        // Set up listener BEFORE sending message
        const responsePromise = this.waitForResponse('PRINTER_DISCONNECTED', 'PRINTER_DISCONNECT_ERROR');
        await this.send({
            type: MESSAGE_TYPES.DISCONNECT_PRINTER,
            payload: { printerId },
        });
        return await responsePromise;
    }
    async print(printerId, base64Data, options) {
        // Set up listener BEFORE sending message
        const responsePromise = this.waitForResponse('PRINT_SUCCESS', 'PRINT_ERROR');
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
    async getState() {
        // Set up listener BEFORE sending message
        const responsePromise = this.waitForResponse('STATE_RESPONSE', 'STATE_ERROR');
        await this.send({
            type: MESSAGE_TYPES.GET_STATE,
        });
        return await responsePromise;
    }
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.messageHandlers.clear();
    }
    isConnected() {
        return this.socket?.readyState === WebSocket.OPEN;
    }
}
//# sourceMappingURL=PrinterService.js.map