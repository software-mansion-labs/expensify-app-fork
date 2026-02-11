import {Buffer} from 'buffer';
import type {Base64URLString} from '@src/utils/Base64URL';

/**
 * Converts an ArrayBuffer to a base64url-encoded string.
 * Uses the same Buffer polyfill approach as src/utils/Base64URL.ts.
 */
function arrayBufferToBase64URL(buffer: ArrayBuffer): Base64URLString {
    return Buffer.from(buffer).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/**
 * Converts a base64url-encoded string to an ArrayBuffer.
 */
function base64URLToArrayBuffer(base64url: string): ArrayBuffer {
    let base64 = base64url.replaceAll('-', '+').replaceAll('_', '/');

    switch (base64.length % 4) {
        case 2:
            base64 += '==';
            break;
        case 3:
            base64 += '=';
            break;
        default:
            break;
    }

    const buf = Buffer.from(base64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export {arrayBufferToBase64URL, base64URLToArrayBuffer};
