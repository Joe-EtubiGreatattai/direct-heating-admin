import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Calendar, Settings as SettingsIcon, LogOut, Images, Star, Wrench, HelpCircle, Layout, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import LoginPage from './LoginPage';
import Dashboard from './pages/Dashboard';
import Quotes from './pages/Quotes';
import Bookings from './pages/Bookings';
import Settings from './pages/Settings';
import GalleryManager from './pages/cms/Gallery';
import TestimonialsManager from './pages/cms/Testimonials';
import ServicesManager from './pages/cms/Services';
import FAQsManager from './pages/cms/FAQs';
import HeroContentManager from './pages/cms/HeroContent';
import PricingManager from './pages/cms/Pricing';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [cmsOpen, setCmsOpen] = useState(false);

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

            {/* CMS Section */}
            <div style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>
              <button
                onClick={() => setCmsOpen(o => !o)}
                className="nav-link"
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', color: 'var(--text-gray)' }}
              >
                <Layout size={20} />
                <div style={{ display: 'flex', flex: 1 }}>Website CMS</div>
                {cmsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {cmsOpen && (
                <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                  <NavLink to="/cms/hero" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }}>
                    <Layout size={17} /> <div style={{ display: 'flex', flex: 1 }}>Hero Banner</div>
                  </NavLink>
                  <NavLink to="/cms/gallery" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }}>
                    <Images size={17} /> <div style={{ display: 'flex', flex: 1 }}>Gallery</div>
                  </NavLink>
                  <NavLink to="/cms/testimonials" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }}>
                    <Star size={17} /> <div style={{ display: 'flex', flex: 1 }}>Testimonials</div>
                  </NavLink>
                  <NavLink to="/cms/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }}>
                    <Wrench size={17} /> <div style={{ display: 'flex', flex: 1 }}>Services</div>
                  </NavLink>
                  <NavLink to="/cms/faqs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }}>
                    <HelpCircle size={17} /> <div style={{ display: 'flex', flex: 1 }}>FAQs</div>
                  </NavLink>
                  <NavLink to="/cms/pricing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }}>
                    <DollarSign size={17} /> <div style={{ display: 'flex', flex: 1 }}>Pricing</div>
                  </NavLink>
                </div>
              )}
            </div>

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
            <Route path="/cms/gallery" element={<GalleryManager fetcher={authenticatedFetch} />} />
            <Route path="/cms/testimonials" element={<TestimonialsManager fetcher={authenticatedFetch} />} />
            <Route path="/cms/services" element={<ServicesManager fetcher={authenticatedFetch} />} />
            <Route path="/cms/faqs" element={<FAQsManager fetcher={authenticatedFetch} />} />
            <Route path="/cms/pricing" element={<PricingManager fetcher={authenticatedFetch} />} />
            <Route path="/cms/hero" element={<HeroContentManager fetcher={authenticatedFetch} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
