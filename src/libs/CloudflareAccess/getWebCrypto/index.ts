import type WebCryptoProvider from './types';

/** Requires a secure context. The dev server is https via mkcert */
const webCrypto: WebCryptoProvider = {
    getRandomValues: (array) => globalThis.crypto.getRandomValues(array),
    sha256: (data) => globalThis.crypto.subtle.digest('SHA-256', data),
};

export default webCrypto;
