"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_TYPES = exports.DEFAULT_RECONNECT_DELAY = exports.DEFAULT_MAX_RECONNECT_ATTEMPTS = exports.DEFAULT_WS_URL = void 0;
exports.DEFAULT_WS_URL = 'ws://localhost:8899';
exports.DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
exports.DEFAULT_RECONNECT_DELAY = 2000;
exports.MESSAGE_TYPES = {
    SEARCH_USB_PRINTERS: 'SEARCH_USB_PRINTERS',
    CONNECT_PRINTER: 'CONNECT_PRINTER',
    DISCONNECT_PRINTER: 'DISCONNECT_PRINTER',
    PRINT_DATA: 'PRINT_DATA',
    GET_STATE: 'GET_STATE',
};
//# sourceMappingURL=constants.js.map