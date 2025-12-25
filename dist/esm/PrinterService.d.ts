import { PrinterConfig, PrinterDevice, MessageHandler, PrintOptions } from './types';
export declare class PrinterService {
    private socket;
    private url;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private messageHandlers;
    private connectionPromise;
    private enableLogging;
    private defaultTimeout;
    constructor(config: PrinterConfig);
    private log;
    connect(): Promise<void>;
    private attemptReconnect;
    on(type: string, handler: MessageHandler): () => void;
    private handleMessage;
    private send;
    private waitForResponse;
    scanPrinters(): Promise<PrinterDevice[]>;
    connectPrinter(printerId: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    disconnectPrinter(printerId: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    print(printerId: string, base64Data: string, options?: PrintOptions): Promise<{
        success: boolean;
        jobId?: string;
        message?: string;
    }>;
    ping(timeout?: number): Promise<boolean>;
    getState(): Promise<any>;
    disconnect(): void;
    isConnected(): boolean;
}
//# sourceMappingURL=PrinterService.d.ts.map