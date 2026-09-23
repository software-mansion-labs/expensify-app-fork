import type WebCryptoProvider from './types';

/** Native: unreachable. QA auth is structurally off on native */
const webCrypto: WebCryptoProvider = {
    getRandomValues: (array) => array,
    sha256: () => Promise.resolve(new ArrayBuffer(0)),
};

export default webCrypto;
