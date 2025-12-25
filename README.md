# Print Setu

A lightweight, browser-compatible SDK for connecting to USB printers via WebSocket without requiring USB driver installation. Perfect for POS systems, thermal printers, and offline printing applications.


<img width="100%" alt="20251225_1745_Dynamic Connection Glow_simple_compose_01kdapyfqwf7fb8ngthzx506gk" src="https://github.com/user-attachments/assets/b3463f48-a574-40f3-aebb-077a813278d8" />

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
import { PrinterService } from 'print-setu';

// Initialize the service
const printer = new PrinterService({
  url: 'ws://127.0.0.1:8899',
  apiKey: 'your-api-key-here'
});

// Connect to the service
await printer.connect();

// Scan for available printers
await printer.scanPrinters();

// Listen for printer discovery results
printer.on('USB_PRINTERS_RESULT', (data) => {
  if (data.payload?.success) {
    console.log('Available printers:', data.payload.data);
  }
});

// Connect to a specific printer
await printer.connectPrinter('printer-id');

// Listen for connection result
printer.on('PRINTER_CONNECTED', (data) => {
  if (data.payload?.success) {
    console.log('Connected to:', data.payload.data);
  }
});

// Print data (base64 encoded)
await printer.print('printer-id', base64Data);

// Listen for print result
printer.on('PRINT_RESULT', (data) => {
  if (data.payload?.success) {
    console.log('Print successful');
  }
});
```

## API Reference

### Initialization

```typescript
import { PrinterService } from 'print-setu';

const printer = new PrinterService({
  url: string;                 // Required: WebSocket URL (e.g., 'ws://127.0.0.1:8899')
  apiKey: string;              // Required: Your API key
  maxReconnectAttempts?: number; // Optional: Max reconnection attempts (default: 5)
  reconnectDelay?: number;     // Optional: Delay between reconnects in ms (default: 2000)
  enableLogging?: boolean;     // Optional: Enable console logging (default: true)
});
```

### Methods

#### `connect(): Promise<void>`
Establishes WebSocket connection to the printer service.

```typescript
await printer.connect();
```

#### `scanPrinters(): Promise<void>`
Scans for available USB printers. Listen to `USB_PRINTERS_RESULT` event for results.

```typescript
await printer.scanPrinters();
```

#### `connectPrinter(printerId: string): Promise<void>`
Connects to a specific printer by its ID. Listen to `PRINTER_CONNECTED` event for the result.

```typescript
await printer.connectPrinter('printer-id');
```

#### `disconnectPrinter(printerId: string): Promise<void>`
Disconnects from a specific printer. Listen to `PRINTER_DISCONNECTED` event for the result.

```typescript
await printer.disconnectPrinter('printer-id');
```

#### `print(printerId: string, base64Data: string): Promise<void>`
Sends print data to the specified printer. Listen to `PRINT_RESULT` event for the result.

```typescript
const base64Data = btoa('Hello, Printer!');
await printer.print('printer-id', base64Data);
```

#### `on(eventType: string, handler: (data: any) => void): () => void`
Subscribes to events. Returns an unsubscribe function.

```typescript
const unsubscribe = printer.on('USB_PRINTERS_RESULT', (data) => {
  console.log(data);
});

// Later, to unsubscribe:
unsubscribe();
```

### Events

The service emits the following events with consistent payload structure:

```typescript
{
  payload?: {
    success: boolean;
    data?: any;
    error?: string;
  };
  error?: string;
}
```

#### Available Events:

**`USB_PRINTERS_RESULT`**

Emitted when printer scan completes.

```typescript
printer.on('USB_PRINTERS_RESULT', (data) => {
  if (data.payload?.success) {
    const printers = data.payload.data; // Array of printer objects
  }
});
```

**`PRINTER_DISCOVERED`**

Emitted when an individual printer is discovered during scanning.

```typescript
printer.on('PRINTER_DISCOVERED', (data) => {
  const printer = data.data; // Single printer object
});
```

**`PRINTER_CONNECTED`**

Emitted when a printer connection attempt completes.

```typescript
printer.on('PRINTER_CONNECTED', (data) => {
  if (data.payload?.success) {
    console.log('Connected:', data.payload.data);
  } else {
    console.error('Connection failed:', data.payload?.error);
  }
});
```

**`PRINTER_DISCONNECTED`**

Emitted when a printer disconnection completes.

```typescript
printer.on('PRINTER_DISCONNECTED', (data) => {
  if (data.payload?.success) {
    console.log('Disconnected successfully');
  }
});
```

**`PRINT_RESULT`**

Emitted when a print job completes.

```typescript
printer.on('PRINT_RESULT', (data) => {
  if (data.payload?.success) {
    console.log('Print successful');
  } else {
    console.error('Print failed:', data.payload?.error);
  }
});
```

**`ERROR`**

Emitted when a general error occurs.

```typescript
printer.on('ERROR', (data) => {
  console.error('Error:', data.error);
});
```

## Examples

### React Hook (Recommended)

Create a custom hook for easy integration:

```typescript
// usePrinter.js
import { useState, useEffect, useCallback } from "react";
import { PrinterService } from 'print-setu';

const printer = new PrinterService({ 
  url: 'ws://127.0.0.1:8899', 
  apiKey: "your-api-key" 
});

export function usePrinter() {
  const [printers, setPrinters] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    printer
      .connect()
      .then(() => setIsConnected(true))
      .catch((err) => {
        setError(err.message);
        setIsConnected(false);
      });

    // Subscribe to events
    const unsubscribePrintersResult = printer.on("USB_PRINTERS_RESULT", (data) => {
      if (data.payload?.success) {
        setPrinters(data.payload.data || []);
        setIsScanning(false);
      } else {
        setError(data.payload?.error || "Failed to get printers");
        setIsScanning(false);
      }
    });

    const unsubscribePrinterDiscovered = printer.on("PRINTER_DISCOVERED", (data) => {
      if (data.data) {
        setPrinters((prev) => {
          const exists = prev.find((p) => p.id === data.data.id);
          return exists ? prev : [...prev, data.data];
        });
      }
    });

    const unsubscribeConnected = printer.on("PRINTER_CONNECTED", (data) => {
      setIsConnecting(false);
      if (data.payload?.success) {
        setConnectedPrinter(data.payload.data);
        setError(null);
      } else {
        setError(data.payload?.error || "Failed to connect");
      }
    });

    const unsubscribePrintResult = printer.on("PRINT_RESULT", (data) => {
      if (!data.payload?.success) {
        setError(data.payload?.error || "Failed to print");
      } else {
        setError(null);
      }
    });

    const unsubscribeError = printer.on("ERROR", (data) => {
      setError(data.error || "An error occurred");
    });

    // Cleanup subscriptions
    return () => {
      unsubscribePrintersResult();
      unsubscribePrinterDiscovered();
      unsubscribeConnected();
      unsubscribePrintResult();
      unsubscribeError();
    };
  }, []);

  const scanPrinters = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);

      return new Promise((resolve, reject) => {
        const unsubscribe = printer.on("USB_PRINTERS_RESULT", (data) => {
          unsubscribe();
          setIsScanning(false);
          
          if (data.payload?.success) {
            setPrinters(data.payload.data || []);
            resolve(data.payload.data);
          } else {
            setError(data.payload?.error || "Failed to scan printers");
            reject(data);
          }
        });

        printer.scanPrinters().catch((err) => {
          setIsScanning(false);
          setError(err.message);
          reject(err);
        });
      });
    } catch (err) {
      setError(err.message);
      setIsScanning(false);
      throw err;
    }
  }, []);

  const connectPrinter = useCallback(async (printerId) => {
    setIsConnecting(true);
    try {
      setError(null);

      return new Promise((resolve, reject) => {
        const unsubscribe = printer.on("PRINTER_CONNECTED", (data) => {
          unsubscribe();
          setIsConnecting(false);
          
          if (data.payload?.success) {
            setConnectedPrinter(data.payload.data);
            resolve(data.payload.data);
          } else {
            setError(data.payload?.error || "Failed to connect");
            reject(data);
          }
        });

        printer.connectPrinter(printerId).catch((err) => {
          setIsConnecting(false);
          setError(err.message);
          reject(err);
        });
      });
    } catch (err) {
      setIsConnecting(false);
      setError(err.message);
      throw err;
    }
  }, []);

  const disconnectPrinter = useCallback(async () => {
    setConnectedPrinter(null);
    setPrinters([]);
    setError(null);
  }, []);

  const print = useCallback(async (printerId, base64Data) => {
    try {
      setError(null);

      return new Promise((resolve, reject) => {
        const unsubscribe = printer.on("PRINT_RESULT", (data) => {
          unsubscribe();
          
          if (data.payload?.success) {
            resolve(data);
          } else {
            setError(data.payload?.error || "Failed to print");
            reject(data);
          }
        });

        printer.print(printerId, base64Data).catch((err) => {
          setError(err.message);
          reject(err);
        });
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    printers,
    isScanning,
    isConnected,
    isConnecting,
    error,
    connectedPrinter,
    scanPrinters,
    connectPrinter,
    disconnectPrinter,
    print
  };
}
```

### Using the Hook in a Component

```typescript
import { usePrinter } from './usePrinter';

function PrinterComponent() {
  const {
    printers,
    isScanning,
    isConnected,
    isConnecting,
    error,
    connectedPrinter,
    scanPrinters,
    connectPrinter,
    print
  } = usePrinter();

  const handlePrint = async () => {
    if (connectedPrinter) {
      const printData = btoa('Hello, Printer!');
      await print(connectedPrinter.id, printData);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      
      <button onClick={scanPrinters} disabled={isScanning || !isConnected}>
        {isScanning ? 'Scanning...' : 'Scan Printers'}
      </button>

      <ul>
        {printers.map((printer) => (
          <li key={printer.id}>
            {printer.name}
            <button 
              onClick={() => connectPrinter(printer.id)}
              disabled={isConnecting}
            >
              Connect
            </button>
          </li>
        ))}
      </ul>

      {connectedPrinter && (
        <div>
          <p>Connected to: {connectedPrinter.name}</p>
          <button onClick={handlePrint}>Print Test</button>
        </div>
      )}
    </div>
  );
}
```

### Vue Integration

```vue
<template>
  <div>
    <div v-if="error" class="error">{{ error }}</div>
    
    <button @click="scanPrinters" :disabled="isScanning || !isConnected">
      {{ isScanning ? 'Scanning...' : 'Scan Printers' }}
    </button>

    <ul>
      <li v-for="printer in printers" :key="printer.id">
        {{ printer.name }}
        <button @click="connectToPrinter(printer.id)" :disabled="isConnecting">
          Connect
        </button>
      </li>
    </ul>

    <div v-if="connectedPrinter">
      <p>Connected to: {{ connectedPrinter.name }}</p>
      <button @click="handlePrint">Print Test</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { PrinterService } from 'print-setu';

const printers = ref([]);
const isScanning = ref(false);
const isConnected = ref(false);
const isConnecting = ref(false);
const error = ref(null);
const connectedPrinter = ref(null);

const printer = new PrinterService({
  url: 'ws://127.0.0.1:8899',
  apiKey: import.meta.env.VITE_PRINTER_API_KEY
});

onMounted(async () => {
  try {
    await printer.connect();
    isConnected.value = true;
  } catch (err) {
    error.value = err.message;
  }

  printer.on('USB_PRINTERS_RESULT', (data) => {
    isScanning.value = false;
    if (data.payload?.success) {
      printers.value = data.payload.data || [];
    } else {
      error.value = data.payload?.error || 'Failed to get printers';
    }
  });

  printer.on('PRINTER_CONNECTED', (data) => {
    isConnecting.value = false;
    if (data.payload?.success) {
      connectedPrinter.value = data.payload.data;
    } else {
      error.value = data.payload?.error || 'Failed to connect';
    }
  });

  printer.on('PRINT_RESULT', (data) => {
    if (!data.payload?.success) {
      error.value = data.payload?.error || 'Failed to print';
    }
  });
});

onUnmounted(() => {
  printer.disconnect();
});

const scanPrinters = async () => {
  isScanning.value = true;
  error.value = null;
  await printer.scanPrinters();
};

const connectToPrinter = async (printerId) => {
  isConnecting.value = true;
  error.value = null;
  await printer.connectPrinter(printerId);
};

const handlePrint = async () => {
  if (connectedPrinter.value) {
    const data = btoa('Hello from Vue!');
    await printer.print(connectedPrinter.value.id, data);
  }
};
</script>
```

## Requirements

- A running WebSocket server (Electron app or standalone service) on `ws://127.0.0.1:8899`
- USB printers connected to the machine running the WebSocket server
- Valid API key for authentication

## Browser Compatibility

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Opera 74+

## Error Handling

All events follow a consistent payload structure. Always check `data.payload?.success` before accessing the data:

```typescript
printer.on('EVENT_NAME', (data) => {
  if (data.payload?.success) {
    // Handle success
    console.log(data.payload.data);
  } else {
    // Handle error
    console.error(data.payload?.error || data.error);
  }
});
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/mishrabhavesh/print-setu/issues
- Documentation: [Coming Soon]

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
