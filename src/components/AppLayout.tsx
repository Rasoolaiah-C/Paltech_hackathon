import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/habits', label: 'All Habits' },
  { to: '/badges', label: 'Badges' },
];

export default function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) {
      return;
    }

    await logout();
    navigate('/login');
  };

  return (
    <div className="app-frame">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <section className="account-card">
          <h1>Habit Tracker</h1>
          <div>
            <strong>Username</strong>
            <p>{user?.displayName || user?.email || 'Guest'}</p>
          </div>
        </section>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="button button--secondary" onClick={handleLogout} type="button">
          Logout
        </button>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-tabs" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
