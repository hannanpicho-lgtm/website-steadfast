import { describe, expect, it } from 'vitest';

describe('LiveChatAdmin module initialization', () => {
  it('imports without temporal dead zone runtime crashes', async () => {
    const module = await import('../app/components/admin/LiveChatAdmin');
    expect(typeof module.default).toBe('function');
  });
});
