import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <h1 className="navbar__brand">Habit Tracker</h1>
      {user && (
        <div className="navbar__session">
          <span className="navbar__email">{user.email}</span>
          <button className="button button--secondary" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
