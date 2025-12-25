import { PrinterConfig, MessageHandler, PrintOptions } from './types';
export declare class PrinterService {
    private socket;
    private url;
    private apiKey;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private messageHandlers;
    private connectionPromise;
    private enableLogging;
    constructor(config: PrinterConfig);
    private log;
    connect(): Promise<void>;
    private attemptReconnect;
    on(type: string, handler: MessageHandler): () => void;
    private handleMessage;
    private send;
    scanPrinters(): Promise<void>;
    connectPrinter(printerId: string): Promise<void>;
    disconnectPrinter(printerId: string): Promise<void>;
    print(printerId: string, base64Data: string, options?: PrintOptions): Promise<void>;
    getState(): Promise<void>;
    disconnect(): void;
    isConnected(): boolean;
}
//# sourceMappingURL=PrinterService.d.ts.map