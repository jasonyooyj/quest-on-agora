import { describe, it, expect } from 'vitest'
import { compressData, decompressData, CompressedData } from '../compression'

describe('compression', () => {
  describe('compressData', () => {
    it('should compress a simple object', () => {
      const data = { message: 'hello world' }
      const result = compressData(data)

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata.algorithm).toBe('pako-deflate')
      expect(result.metadata.originalSize).toBeGreaterThan(0)
      expect(result.metadata.compressedSize).toBeGreaterThan(0)
    })

    it('should compress an array', () => {
      const data = [1, 2, 3, 'test', { nested: true }]
      const result = compressData(data)

      expect(result.data).toBeTruthy()
      expect(typeof result.data).toBe('string')
    })

    it('should compress a string', () => {
      const data = 'This is a test string for compression'
      const result = compressData(data)

      expect(result.metadata.originalSize).toBeGreaterThan(0)
    })

    it('should handle empty object', () => {
      const data = {}
      const result = compressData(data)

      expect(result.data).toBeTruthy()
      expect(result.metadata.originalSize).toBe(2) // "{}"
    })

    it('should calculate compression ratio', () => {
      // Large repetitive data compresses well
      const data = { text: 'a'.repeat(1000) }
      const result = compressData(data)

      expect(result.metadata.compressionRatio).toBeGreaterThan(0)
    })

    it('should include valid timestamp', () => {
      const result = compressData({ test: true })
      const timestamp = new Date(result.metadata.timestamp)

      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })

  describe('decompressData', () => {
    it('should decompress to original object', () => {
      const original = { message: 'hello', count: 42, nested: { value: true } }
      const compressed = compressData(original)
      const decompressed = decompressData(compressed.data)

      expect(decompressed).toEqual(original)
    })

    it('should decompress to original array', () => {
      const original = [1, 'two', { three: 3 }, [4, 5]]
      const compressed = compressData(original)
      const decompressed = decompressData(compressed.data)

      expect(decompressed).toEqual(original)
    })

    it('should handle Korean text', () => {
      const original = { message: '안녕하세요, 테스트입니다.' }
      const compressed = compressData(original)
      const decompressed = decompressData(compressed.data)

      expect(decompressed).toEqual(original)
    })

    it('should handle large data', () => {
      const original = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: 'x'.repeat(100),
        })),
      }
      const compressed = compressData(original)
      const decompressed = decompressData(compressed.data)

      expect(decompressed).toEqual(original)
    })

    it('should fallback to plain JSON if decompression fails', () => {
      const plainJson = JSON.stringify({ test: 'value' })
      const result = decompressData(plainJson)

      expect(result).toEqual({ test: 'value' })
    })

    it('should throw error for invalid data', () => {
      expect(() => decompressData('not-valid-data')).toThrow()
    })
  })

  describe('round-trip', () => {
    it('should preserve data integrity through compression cycle', () => {
      const testCases = [
        { simple: 'object' },
        [1, 2, 3],
        'plain string',
        123,
        true,
        null,
        { deeply: { nested: { object: { with: 'values' } } } },
      ]

      testCases.forEach((original) => {
        const compressed = compressData(original)
        const decompressed = decompressData(compressed.data)
        expect(decompressed).toEqual(original)
      })
    })
  })
})
