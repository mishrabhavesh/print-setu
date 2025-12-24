export { PrinterService } from './PrinterService';
export * from './types';
export * from './constants';

// Factory function for convenience
import { PrinterService } from './PrinterService';
import { PrinterConfig } from './types';

export function createPrinterService(config: PrinterConfig): PrinterService {
  return new PrinterService(config);
}
