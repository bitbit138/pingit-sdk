import { describe, it, expect } from 'vitest';
import { navItemsForRole, canAccess, NAV_ITEMS } from './roles';

describe('navItemsForRole', () => {
  it('gives admins every sidebar item', () => {
    expect(navItemsForRole('admin')).toHaveLength(NAV_ITEMS.length);
  });

  it('hides admin-only items from developers', () => {
    const dev = navItemsForRole('developer');
    expect(dev.every((i) => !i.adminOnly)).toBe(true);
    expect(dev.length).toBeLessThan(NAV_ITEMS.length);
  });

  it('treats a null role like a developer (no admin items)', () => {
    expect(navItemsForRole(null).some((i) => i.adminOnly)).toBe(false);
  });
});

describe('canAccess', () => {
  it('blocks developers from admin-only routes but allows admins', () => {
    expect(canAccess('developer', '/health')).toBe(false);
    expect(canAccess('admin', '/health')).toBe(true);
  });

  it('allows everyone on non-gated routes', () => {
    expect(canAccess('developer', '/analytics')).toBe(true);
  });
});
