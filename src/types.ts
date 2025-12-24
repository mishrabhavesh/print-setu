export interface PrinterConfig {
  url?: string;
  apiKey: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  enableLogging?: boolean;
}

export interface PrinterDevice {
  printerId: string;
  name: string;
  manufacturer?: string;
  status: 'connected' | 'disconnected' | 'busy';
}

export interface PrinterMessage {
  type: string;
  payload?: any;
}

export interface PrinterStateResponse {
  printers: PrinterDevice[];
  connectedPrinters: string[];
}

export type MessageHandler = (data: any) => void;

export interface PrintOptions {
  copies?: number;
  paperSize?: string;
}
