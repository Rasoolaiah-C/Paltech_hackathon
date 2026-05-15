import React from 'react';
import Navbar from '../components/Navbar';

const Dashboard: React.FC = () => {
  return (
    <div>
      <Navbar />
      <div style={{ padding: '20px' }}>
        <h1>Dashboard</h1>
        <p>Welcome to your Habit Tracker!</p>
        {/* Add habit tracking components here */}
      </div>
    </div>
  );
};

export default Dashboard;