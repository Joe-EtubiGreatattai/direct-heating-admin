import { useState, useEffect } from 'react';
import { MessageSquare, Calendar } from 'lucide-react';

const API_BASE = 'https://direct-heating.duckdns.org/api';

export default function Dashboard({ fetcher }: { fetcher: any }) {
  const [stats, setStats] = useState({ quotes: 0, bookings: 0 });

  useEffect(() => {
    fetcher(`${API_BASE}/admin/quotes`).then((res: any) => res.json()).then((data: any) => setStats((s: any) => ({ ...s, quotes: data.length })));
    fetcher(`${API_BASE}/admin/bookings`).then((res: any) => res.json()).then((data: any) => setStats((s: any) => ({ ...s, bookings: data.length })));
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <h1>Dashboard Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--text-gray)', fontWeight: 600 }}>Total Quotes</span>
            <div style={{ background: 'rgba(201, 169, 98, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--accent)' }}>
              <MessageSquare size={24} />
            </div>
          </div>
          <div className="stat-value">{stats.quotes}</div>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '1rem' }}>All-time quote inquiries</p>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--text-gray)', fontWeight: 600 }}>Total Bookings</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--success)' }}>
              <Calendar size={24} />
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.bookings}</div>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '1rem' }}>Confirmed and pending services</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
        <p style={{ color: 'var(--text-gray)' }}>No recent activity to show.</p>
      </div>
    </div>
  );
}
