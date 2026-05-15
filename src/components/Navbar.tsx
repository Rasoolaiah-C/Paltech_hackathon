import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: '#f0f0f0' }}>
      <h2>Habit Tracker</h2>
      {user && (
        <div>
          <span>Welcome, {user.email}</span>
          <button onClick={handleLogout} style={{ marginLeft: '10px', padding: '5px 10px' }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;