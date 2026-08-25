/**
 * Extra setup for the web repro harness.
 *
 * The base Jest config sets `globals.WebSocket = {}`, but expo's web entry boots Metro's
 * HMRClient, which does `new WebSocket(...)`. Provide an inert constructor so the import
 * chain gets through. Nothing in this harness uses websockets.
 */
class NoopWebSocket {
    static CONNECTING = 0;

    static OPEN = 1;

    static CLOSING = 2;

    static CLOSED = 3;

    readyState = 3;

    close() {}

    send() {}

    addEventListener() {}

    removeEventListener() {}
}

// @ts-expect-error - intentionally replacing the stub the base config installs.
global.WebSocket = NoopWebSocket;
