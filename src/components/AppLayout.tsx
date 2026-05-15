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
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-frame">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <div>
          <h1>Habit Tracker</h1>
          {user?.email && <p>{user.email}</p>}
        </div>
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
