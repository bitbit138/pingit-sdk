import { NavLink } from 'react-router-dom';
import { navItemsForRole } from '@/lib/roles';
import { useAuth } from '@/auth/useAuth';

export function Sidebar() {
  const { role } = useAuth();
  const items = navItemsForRole(role);
  return (
    <nav className="sidebar" aria-label="Primary">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            isActive ? 'sidebar__item sidebar__item--active' : 'sidebar__item'
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
