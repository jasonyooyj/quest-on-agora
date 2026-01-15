import pako from 'pako';

export interface CompressedData {
    data: string;
    metadata: {
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
        algorithm: string;
        timestamp: string;
    };
}

/**
 * Compress data using pako (gzip)
 */
export function compressData(data: unknown): CompressedData {
    const jsonString = JSON.stringify(data);
    const originalSize = new TextEncoder().encode(jsonString).length;

    // Compress using pako
    const compressed = pako.deflate(jsonString);
    const compressedBase64 = Buffer.from(compressed).toString('base64');
    const compressedSize = compressedBase64.length;

    return {
        data: compressedBase64,
        metadata: {
            originalSize,
            compressedSize,
            compressionRatio: originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0,
            algorithm: 'pako-deflate',
            timestamp: new Date().toISOString(),
        },
    };
}

/**
 * Decompress data
 */
export function decompressData(compressedBase64: string): unknown {
    try {
        const compressedBuffer = Buffer.from(compressedBase64, 'base64');
        const decompressed = pako.inflate(compressedBuffer, { to: 'string' });
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('Decompression error:', error);
        // If decompression fails, try to parse as plain JSON (fallback for uncompressed data)
        try {
            return JSON.parse(compressedBase64);
        } catch {
            throw new Error('Failed to decompress or parse data');
        }
    }
}
