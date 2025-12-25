export { PrinterService } from './PrinterService';
export * from './types';
export * from './constants';
// Factory function for convenience
import { PrinterService } from './PrinterService';
export function createPrinterService(config) {
    return new PrinterService(config);
}
//# sourceMappingURL=index.js.map