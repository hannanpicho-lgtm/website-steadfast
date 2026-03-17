// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPublicApiHeaders } from '../app/services/publicApi';

describe('buildPublicApiHeaders', () => {
  it('returns Authorization and apikey headers by default', () => {
    const headers = buildPublicApiHeaders();
    expect(headers.Authorization).toMatch(/^Bearer /);
    expect(headers.apikey).toBeTruthy();
  });

  it('Authorization and apikey hold the same token value', () => {
    const headers = buildPublicApiHeaders();
    const token = headers.Authorization.replace('Bearer ', '');
    expect(headers.apikey).toBe(token);
  });

  it('does NOT include Content-Type when contentType=false (default)', () => {
    const headers = buildPublicApiHeaders();
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('does NOT include Content-Type when contentType is omitted', () => {
    const headers = buildPublicApiHeaders();
    expect(Object.keys(headers)).not.toContain('Content-Type');
  });

  it('includes Content-Type: application/json when contentType=true', () => {
    const headers = buildPublicApiHeaders(true);
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns exactly 2 keys when contentType=false', () => {
    const headers = buildPublicApiHeaders(false);
    expect(Object.keys(headers)).toHaveLength(2);
  });

  it('returns exactly 3 keys when contentType=true', () => {
    const headers = buildPublicApiHeaders(true);
    expect(Object.keys(headers)).toHaveLength(3);
  });

  it('Authorization token is a non-empty string', () => {
    const headers = buildPublicApiHeaders();
    const token = headers.Authorization.replace('Bearer ', '');
    expect(token.length).toBeGreaterThan(0);
  });
});
