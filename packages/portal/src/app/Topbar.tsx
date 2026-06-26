import { useAuth } from '@/auth/useAuth';

export function Topbar() {
  const { role, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar__title">PingIt · Admin Portal</div>
      <div className="topbar__right">
        <span>
          signed in: <span className="topbar__role">{role ?? '—'}</span> ▾
        </span>
        <button className="btn btn--ghost" type="button" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
