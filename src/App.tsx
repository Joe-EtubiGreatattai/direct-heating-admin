import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Calendar, Settings as SettingsIcon, LogOut } from 'lucide-react';
import LoginPage from './LoginPage';
import Dashboard from './pages/Dashboard';
import Quotes from './pages/Quotes';
import Bookings from './pages/Bookings';
import Settings from './pages/Settings';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));

  const handleLogin = (newToken: string) => {
    localStorage.setItem('adminToken', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  return (
    <Router>
      <div className="admin-layout">
        <aside className="sidebar">
          <Link to="/" className="sidebar-logo">DIRECT HEATING</Link>
          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <LayoutDashboard size={20} /> <div style={{ display: 'flex', flex: 1 }}>Dashboard</div>
            </NavLink>
            <NavLink to="/quotes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <MessageSquare size={20} /> <div style={{ display: 'flex', flex: 1 }}>Quotes</div>
            </NavLink>
            <NavLink to="/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Calendar size={20} /> <div style={{ display: 'flex', flex: 1 }}>Bookings</div>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <SettingsIcon size={20} /> <div style={{ display: 'flex', flex: 1 }}>Settings</div>
            </NavLink>
            
            <button 
              onClick={handleLogout} 
              className="nav-link" 
              style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', marginTop: 'auto', textAlign: 'left', opacity: 0.7 }}
            >
              <LogOut size={20} /> Logout
            </button>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard fetcher={authenticatedFetch} />} />
            <Route path="/quotes" element={<Quotes fetcher={authenticatedFetch} />} />
            <Route path="/bookings" element={<Bookings fetcher={authenticatedFetch} />} />
            <Route path="/settings" element={<Settings fetcher={authenticatedFetch} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
