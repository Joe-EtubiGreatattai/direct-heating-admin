import { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Calendar } from 'lucide-react';

const API_BASE = 'https://direct-heating.duckdns.org/api';

export default function Quotes({ fetcher }: { fetcher: any }) {
  const [quotes, setQuotes] = useState([]);
  
  useEffect(() => {
    fetcher(`${API_BASE}/admin/quotes`).then((res: any) => res.json()).then(setQuotes);
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <h1>Quote Inquiries</h1>
      <div className="card" style={{ padding: '0' }}>
        <table>
          <thead>
            <tr>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14}/> Customer</div></th>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={14}/> Service</div></th>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14}/> Date</div></th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q: any) => (
              <tr key={q._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{q.firstName} {q.lastName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>{q.email}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{q.service}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>{q.customerType}</div>
                </td>
                <td style={{ color: 'var(--text-gray)' }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotes.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-gray)' }}>
            <Mail size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No quote inquiries received yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
