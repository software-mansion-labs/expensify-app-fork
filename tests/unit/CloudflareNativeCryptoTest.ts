import type WebCryptoProvider from '@libs/CloudflareAccess/getWebCrypto/types';

const mockGetRandomValues = jest.fn((array: Uint8Array) => array);
const mockDigest = jest.fn<Buffer, []>();
const mockUpdate = jest.fn(() => ({digest: mockDigest}));
const mockCreateHash = jest.fn((algorithm: string) => ({algorithm, update: mockUpdate}));

// The real package binds native JSI HybridObjects at import, which no Jest environment can provide
jest.mock('react-native-quick-crypto', () => ({
    getRandomValues: (array: Uint8Array) => mockGetRandomValues(array),
    createHash: (algorithm: string) => mockCreateHash(algorithm),
}));

describe('native getWebCrypto', () => {
    let webCrypto: WebCryptoProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        webCrypto = jest.requireActual<{default: WebCryptoProvider}>('../../src/libs/CloudflareAccess/getWebCrypto/index.native.ts').default;
    });

    it('fills the caller’s array in place and hands the same reference back', () => {
        // Given an array the caller will read the verifier bytes out of
        const array = new Uint8Array(32);
        mockGetRandomValues.mockImplementation((target: Uint8Array) => {
            target.fill(7);
            return target;
        });

        // When random bytes are requested
        const result = webCrypto.getRandomValues(array);

        // Then the same array is returned, filled: Base64URL.encode reads the argument, not the return value
        expect(result).toBe(array);
        expect(result[0]).toBe(7);
    });

    it('hashes with sha256 and returns the digest bytes as a standalone ArrayBuffer', async () => {
        // Given a pooled Buffer, which is a view onto a larger ArrayBuffer than the digest itself
        const pool = new Uint8Array([9, 9, 1, 2, 3, 4, 9]);
        const digestView = Buffer.from(pool.buffer, 2, 4);
        mockDigest.mockReturnValue(digestView);

        // When a verifier is hashed
        const digest = await webCrypto.sha256(new TextEncoder().encode('verifier'));

        // Then only the digest bytes come back, copied out of the pool: handing the pool over would encode
        // the adjacent bytes into the code challenge
        expect(mockCreateHash).toHaveBeenCalledWith('sha256');
        expect(new Uint8Array(digest)).toEqual(new Uint8Array([1, 2, 3, 4]));
        expect(digest.byteLength).toBe(4);
    });

    it('accepts a bare ArrayBuffer as well as a view', async () => {
        // Given a BufferSource that is not a typed-array view
        mockDigest.mockReturnValue(Buffer.from([5]));
        const buffer = new ArrayBuffer(3);

        // When it is hashed, Then the conversion must not throw: the type allows either shape
        await expect(webCrypto.sha256(buffer)).resolves.toBeDefined();
        expect(mockUpdate).toHaveBeenCalledWith(new Uint8Array(3));
    });
});
