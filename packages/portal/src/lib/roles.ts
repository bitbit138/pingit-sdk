import type { Role } from '@pingit/contracts';

export interface NavItem {
  /** Router path. */
  to: string;
  label: string;
  /** When true, only admins see this item / may visit the route. */
  adminOnly: boolean;
}

/** The six sidebar items, matching the deck wireframe order. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', adminOnly: false },
  { to: '/profiles', label: 'Profiles', adminOnly: false },
  { to: '/history', label: 'History', adminOnly: false },
  { to: '/apps', label: 'Apps & keys', adminOnly: false },
  { to: '/health', label: 'Health', adminOnly: true },
  { to: '/crashes', label: 'Crashes', adminOnly: false },
];

/** Filter the sidebar for a role — developers don't see admin-only items. */
export function navItemsForRole(role: Role | null): NavItem[] {
  if (role === 'admin') return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => !item.adminOnly);
}

/** Whether a role may visit a given route path (route-level gating). */
export function canAccess(role: Role | null, path: string): boolean {
  const item = NAV_ITEMS.find((i) => i.to === path);
  if (!item) return true; // unknown/non-gated routes (analytics, etc.)
  if (item.adminOnly) return role === 'admin';
  return true;
}
