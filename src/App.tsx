import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Calendar, Settings as SettingsIcon, LogOut, Layout, ChevronDown, ChevronRight, Menu, X, Home, Phone, BriefcaseBusiness, Building2, PoundSterling, Star, CalendarDays } from 'lucide-react';
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
import CmsPageSections from './pages/cms/PageSections';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [cmsOpen, setCmsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('adminToken', newToken);
    setToken(newToken);
  };

  const closeSidebar = () => setSidebarOpen(false);

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
      <div className={`admin-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
        <header className="mobile-topbar">
          <div className="mobile-topbar-inner">
            <button type="button" className="icon-btn" onClick={() => setSidebarOpen(o => !o)} aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="mobile-topbar-title">
              <strong>DIRECT HEATING</strong>
              <span>Admin Panel</span>
            </div>
            <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <button type="button" className="sidebar-backdrop" onClick={closeSidebar} aria-label="Close menu" />

        <aside className="sidebar">
          <Link to="/" className="sidebar-logo" onClick={closeSidebar} aria-label="Direct Heating Dashboard">
            <img src="./direct-heating-logo-tsp-white.png" alt="Direct Heating" className="sidebar-logo-img" />
          </Link>
          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end onClick={closeSidebar}>
              <LayoutDashboard size={20} /> <div style={{ display: 'flex', flex: 1 }}>Dashboard</div>
            </NavLink>
            <NavLink to="/quotes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <MessageSquare size={20} /> <div style={{ display: 'flex', flex: 1 }}>Quotes</div>
            </NavLink>
            <NavLink to="/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <Calendar size={20} /> <div style={{ display: 'flex', flex: 1 }}>Bookings</div>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
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
                  <NavLink to="/cms/site/home" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <Home size={17} /> <div style={{ display: 'flex', flex: 1 }}>Home</div>
                  </NavLink>
                  <NavLink to="/cms/site/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <BriefcaseBusiness size={17} /> <div style={{ display: 'flex', flex: 1 }}>Services</div>
                  </NavLink>
                  <NavLink to="/cms/site/pricing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <PoundSterling size={17} /> <div style={{ display: 'flex', flex: 1 }}>Pricing</div>
                  </NavLink>
                  <NavLink to="/cms/site/testimonials" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <Star size={17} /> <div style={{ display: 'flex', flex: 1 }}>Reviews</div>
                  </NavLink>
                  <NavLink to="/cms/site/contact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <Phone size={17} /> <div style={{ display: 'flex', flex: 1 }}>Contact Us</div>
                  </NavLink>
                  <NavLink to="/cms/site/household" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <Building2 size={17} /> <div style={{ display: 'flex', flex: 1 }}>Household</div>
                  </NavLink>
                  <NavLink to="/cms/site/business" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <Building2 size={17} /> <div style={{ display: 'flex', flex: 1 }}>Business</div>
                  </NavLink>
                  <NavLink to="/cms/site/book-now" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={closeSidebar}>
                    <CalendarDays size={17} /> <div style={{ display: 'flex', flex: 1 }}>Book Now</div>
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
            <Route path="/cms" element={<Navigate to="/cms/site/home" replace />} />
            <Route path="/cms/site/:pageKey" element={<CmsPageSections fetcher={authenticatedFetch} />} />
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
