# Print Setu

A lightweight, browser-compatible SDK for connecting to USB printers via WebSocket without requiring USB driver installation. Perfect for POS systems, thermal printers, and offline printing applications.

## Features

✅ **No USB Drivers Required** - Print directly from browser to USB printers  
✅ **Offline Support** - Works completely offline via local WebSocket  
✅ **Auto-Reconnection** - Handles disconnections gracefully  
✅ **TypeScript Support** - Full type definitions included  
✅ **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS  
✅ **Event-Driven** - Subscribe to printer events and status updates  

## Installation

```bash
npm install print-setu
```

Or with yarn:
```bash
yarn add print-setu
```

## Quick Start

```typescript
import { createPrinterService } from '@yourorg/printer-websocket-sdk';

// Initialize the service
const printerService = createPrinterService({
  apiKey: 'your-api-key-here',
  url: 'ws://localhost:8899', // optional, defaults to localhost:8899
});

// Connect to the service
await printerService.connect();

// Scan for available printers
await printerService.scanPrinters();

// Listen for printer discovery
printerService.on('PRINTERS_FOUND', (data) => {
  console.log('Available printers:', data.printers);
});

// Connect to a specific printer
await printerService.connectPrinter('printer-id');

// Print data (base64 encoded)
await printerService.print('printer-id', base64Data);
```

## API Reference

### Initialization

```typescript
import { PrinterService } from '@yourorg/printer-websocket-sdk';

const service = new PrinterService({
  apiKey: string;              // Required: Your API key
  url?: string;                // Optional: WebSocket URL (default: ws://localhost:8899)
  maxReconnectAttempts?: number; // Optional: Max reconnection attempts (default: 5)
  reconnectDelay?: number;     // Optional: Delay between reconnects in ms (default: 2000)
  enableLogging?: boolean;     // Optional: Enable console logging (default: true)
});
```

### Methods

#### `connect(): Promise<void>`
Establishes WebSocket connection to the printer service.

#### `scanPrinters(): Promise<void>`
Scans for available USB printers. Listen to `PRINTERS_FOUND` event for results.

#### `connectPrinter(printerId: string): Promise<void>`
Connects to a specific printer by its ID.

#### `disconnectPrinter(printerId: string): Promise<void>`
Disconnects from a specific printer.

#### `print(printerId: string, base64Data: string, options?: PrintOptions): Promise<void>`
Sends print data to the specified printer.

**Options:**
- `copies?: number` - Number of copies to print
- `paperSize?: string` - Paper size specification

#### `getState(): Promise<void>`
Requests current state of all printers. Listen to `STATE_UPDATE` event for results.

#### `disconnect(): void`
Closes the WebSocket connection and cleans up resources.

#### `isConnected(): boolean`
Returns whether the service is currently connected.

#### `on(eventType: string, handler: (data: any) => void): () => void`
Subscribes to events. Returns an unsubscribe function.

### Events

Listen to events using the `on()` method:

```typescript
// Printers discovered
printerService.on('PRINTERS_FOUND', (data) => {
  console.log(data.printers);
});

// Printer connected
printerService.on('PRINTER_CONNECTED', (data) => {
  console.log('Connected to:', data.printerId);
});

// Print job completed
printerService.on('PRINT_SUCCESS', (data) => {
  console.log('Print completed');
});

// Error occurred
printerService.on('ERROR', (data) => {
  console.error('Error:', data.message);
});
```

## Examples

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { createPrinterService, PrinterDevice } from '@yourorg/printer-websocket-sdk';

function PrinterComponent() {
  const [printers, setPrinters] = useState([]);
  const [service] = useState(() => createPrinterService({
    apiKey: process.env.REACT_APP_PRINTER_API_KEY!
  }));

  useEffect(() => {
    service.connect();
    
    const unsubscribe = service.on('PRINTERS_FOUND', (data) => {
      setPrinters(data.printers);
    });

    service.scanPrinters();

    return () => {
      unsubscribe();
      service.disconnect();
    };
  }, [service]);

  const handlePrint = async (printerId: string) => {
    const printData = btoa('Hello, Printer!');
    await service.print(printerId, printData);
  };

  return (
    
      {printers.map(printer => (
        <button key={printer.printerId} onClick={() => handlePrint(printer.printerId)}>
          Print to {printer.name}
        
      ))}
    
  );
}
```

### Vue Integration

```vue
<template>
  <div>
    <button @click="scanPrinters">Scan Printers</button>
    <ul>
      <li v-for="printer in printers" :key="printer.printerId">
        {{ printer.name }}
        <button @click="print(printer.printerId)">Print</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { createPrinterService } from '@yourorg/printer-websocket-sdk';

const printers = ref([]);
const service = createPrinterService({
  apiKey: import.meta.env.VITE_PRINTER_API_KEY
});

onMounted(async () => {
  await service.connect();
  
  service.on('PRINTERS_FOUND', (data) => {
    printers.value = data.printers;
  });
});

onUnmounted(() => {
  service.disconnect();
});

const scanPrinters = () => {
  service.scanPrinters();
};

const print = async (printerId) => {
  const data = btoa('Hello from Vue!');
  await service.print(printerId, data);
};
</script>
```

## Requirements

- A running WebSocket server (Electron app or standalone service) on `ws://localhost:8899`
- USB printers connected to the machine running the WebSocket server

## Browser Compatibility

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Opera 74+

## License

MIT © [Your Name]

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourorg/printer-websocket-sdk/issues
- Documentation: https://docs.yoursite.com

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
