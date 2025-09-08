import { describe, expect, it } from 'vitest';

describe('Vitest Configuration', () => {
  it('should be properly configured', () => {
    expect(true).toBe(true);
  });

  it('should have jsdom environment', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('should support React Testing Library imports', async () => {
    const rtl = await import('@testing-library/react');
    expect(rtl.render).toBeDefined();
  });
});
