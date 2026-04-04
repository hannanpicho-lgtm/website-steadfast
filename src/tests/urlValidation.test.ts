import { describe, it, expect } from 'vitest';
import { normalizeHttpUrl } from '../app/utils/urlValidation';

describe('normalizeHttpUrl', () => {
  it('accepts valid https URLs and normalizes them', () => {
    expect(normalizeHttpUrl(' https://example.com/product?id=1 ')).toBe('https://example.com/product?id=1');
  });

  it('rejects non-http protocols', () => {
    expect(normalizeHttpUrl('ftp://example.com/file')).toBe('');
    expect(normalizeHttpUrl('javascript:alert(1)')).toBe('');
  });

  it('rejects invalid or empty URLs', () => {
    expect(normalizeHttpUrl('not-a-url')).toBe('');
    expect(normalizeHttpUrl('   ')).toBe('');
  });

  it('rejects very long URLs over safety limit', () => {
    const longUrl = `https://example.com/${'a'.repeat(2100)}`;
    expect(normalizeHttpUrl(longUrl)).toBe('');
  });
});
