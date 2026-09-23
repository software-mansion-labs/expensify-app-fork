type WebCryptoProvider = {
    getRandomValues: (array: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
    sha256: (data: BufferSource) => Promise<ArrayBuffer>;
};

export default WebCryptoProvider;
