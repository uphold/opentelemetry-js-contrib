import { describe, expect, it } from 'vitest';
import { isLayerIgnored } from './utils';

describe('utils', () => {
  describe('isLayerIgnored()', () => {
    it('should return true if `config.spanLayers` is missing', () => {
      expect(isLayerIgnored('foo', {})).toBe(true);
    });

    it('should return true if `config.spanLayers` is undefined', () => {
      expect(isLayerIgnored('foo', { spanLayers: undefined })).toBe(true);
    });

    it('should return true if `config.spanLayers` is not an array', () => {
      expect(isLayerIgnored('foo', { spanLayers: {} as unknown as string[] })).toBe(true);
    });

    it('should return false if `config.spanLayers` has a string that matches the name', () => {
      expect(isLayerIgnored('foo', { spanLayers: ['foo'] })).toBe(false);
    });

    it('should return false if `config.spanLayers` has a regex that matches the name', () => {
      expect(isLayerIgnored('foo', { spanLayers: [/fo{2}/] })).toBe(false);
    });

    it('should return false if `config.spanLayers` has a function that returns true', () => {
      expect(isLayerIgnored('foo', { spanLayers: [() => true] })).toBe(false);
    });

    it('should return true if `config.spanLayers` has an unsupported item', () => {
      expect(isLayerIgnored('foo', { spanLayers: [123 as unknown as string] })).toBe(true);
    });

    it('should return true if `config.spanLayers` has no matches for the name', () => {
      expect(isLayerIgnored('foo', { spanLayers: ['bar', /biz/, () => false] })).toBe(true);
    });

    it('should return true if `config.spanLayers` matching throws an errors', () => {
      expect(
        isLayerIgnored('foo', {
          spanLayers: [
            () => {
              throw new Error();
            }
          ]
        })
      ).toBe(true);
    });
  });
});
