import {createHash, getRandomValues} from 'react-native-quick-crypto';

import type WebCryptoProvider from './types';

/** Hermes has no Web Crypto, so the Node-shaped API from `react-native-quick-crypto` stands in for it */
const webCrypto: WebCryptoProvider = {
    getRandomValues: (array) => {
        getRandomValues(array);
        return array;
    },
    sha256: (data) => {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const digest = createHash('sha256').update(bytes).digest();
        // Copied out rather than handed over: a Buffer is a view onto a larger pooled ArrayBuffer
        return Promise.resolve(digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength));
    },
};

export default webCrypto;
