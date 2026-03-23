import { useState, useEffect } from 'react';
import { Check, X, Calendar, User, Clock, MessageSquare, Send } from 'lucide-react';

const API_BASE = 'https://direct-heating.duckdns.org/api';

type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

interface Booking {
  _id: string;
  fullName: string;
  email: string;
  date: string;
  timeSlot: string;
  status: string;
}

interface Props {
  fetcher: Fetcher;
}

export default function Bookings({ fetcher }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchBookings = async () => {
    const res = await fetcher(`${API_BASE}/admin/bookings`);
    const json = (await res.json()) as unknown;
    setBookings(Array.isArray(json) ? (json as Booking[]) : []);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetcher(`${API_BASE}/admin/bookings`);
      const json = (await res.json()) as unknown;
      if (cancelled) return;
      setBookings(Array.isArray(json) ? (json as Booking[]) : []);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const handleOpenModal = (id: string, status: string) => {
    setUpdatingId(id);
    setUpdatingStatus(status);
    setAdminNote('');
    setIsModalOpen(true);
  };

  const confirmUpdate = async () => {
    if (!updatingId || !updatingStatus) return;

    await fetcher(`${API_BASE}/admin/bookings/${updatingId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: updatingStatus, adminNote })
    });

    setIsModalOpen(false);
    setUpdatingId(null);
    setUpdatingStatus(null);
    void fetchBookings();
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', position: 'relative' }}>
      <h1>Booking Management</h1>
      <div className="card table-card">
        <table style={{ minWidth: '860px' }}>
          <thead>
            <tr>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> Customer</div></th>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} /> Date</div></th>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} /> Time</div></th>
              <th>Status</th>
              <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.fullName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>{b.email}</div>
                </td>
                <td style={{ fontWeight: 500 }}>{b.date}</td>
                <td style={{ fontWeight: 500 }}>{b.timeSlot}</td>
                <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                  {b.status === 'pending' && (
                    <div style={{ display: 'inline-flex', gap: '0.8rem' }}>
                      <button onClick={() => handleOpenModal(b._id, 'accepted')} className="btn btn-success" title="Accept"><Check size={18} /></button>
                      <button onClick={() => handleOpenModal(b._id, 'rejected')} className="btn btn-danger" title="Reject"><X size={18} /></button>
                    </div>
                  )}
                  {b.status !== 'pending' && <span style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>No actions</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-gray)' }}>
            <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>No bookings found yet.</p>
          </div>
        )}
      </div>

      {/* Custom Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                background: updatingStatus === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                padding: '0.8rem',
                borderRadius: '12px',
                color: updatingStatus === 'accepted' ? 'var(--success)' : 'var(--danger)'
              }}>
                <MessageSquare size={24} />
              </div>
              <h3 style={{ margin: 0 }}>{updatingStatus === 'accepted' ? 'Accept Booking' : 'Reject Booking'}</h3>
            </div>

            <p style={{ color: 'var(--text-gray)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Add an optional message for the customer. They will receive this via email.
            </p>

            <div className="form-group">
              <label>Message to Customer</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. We look forward to seeing you!"
                style={{ minHeight: '120px', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => setIsModalOpen(false)} className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                className="btn btn-primary"
                style={{ flex: 1, background: updatingStatus === 'accepted' ? 'var(--success)' : 'var(--danger)', color: 'white' }}
              >
                Confirm {updatingStatus === 'accepted' ? 'Accept' : 'Reject'} <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
