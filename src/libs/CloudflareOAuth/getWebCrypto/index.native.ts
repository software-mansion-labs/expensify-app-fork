import type WebCryptoProvider from './types';

/**
 * Native: not implemented in the web POC. The eventual implementation must use react-native-quick-crypto's
 * WebCrypto surface (`getRandomValues` + `subtle.digest`) — NOT its Node-style `createHash` API — so the
 * shared PKCE helper keeps a single implementation (see Web_POC.md §2.1). Throwing (instead of importing a
 * dependency we haven't added) keeps the module import-safe on native while making accidental use loud.
 */
const webCrypto: WebCryptoProvider = {
    getRandomValues: () => {
        throw new Error('CloudflareOAuth getWebCrypto is not implemented on native yet (web-only POC)');
    },
    sha256: () => {
        throw new Error('CloudflareOAuth getWebCrypto is not implemented on native yet (web-only POC)');
    },
};

export default webCrypto;
