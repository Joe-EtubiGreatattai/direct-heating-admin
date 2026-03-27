import { useMemo, useState, useEffect } from 'react';
import { Check, X, MessageSquare, Send } from 'lucide-react';

const API_BASE = 'https://direct-heating.duckdns.org/api';

type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

interface Booking {
  _id: string;
  fullName: string;
  email: string;
  address?: string;
  jobType?: string;
  customerType?: string;
  date: string;
  timeSlot: string;
  slotCount?: number;
  status: string;
  estimatedArrival?: string;
}

const COMMERCIAL_TYPES = ['commercial', 'property'];

function bookingCategory(b: Booking): 'domestic' | 'commercial' {
  return COMMERCIAL_TYPES.includes((b.customerType || '').toLowerCase()) ? 'commercial' : 'domestic';
}

interface Props {
  fetcher: Fetcher;
}

type CalendarItem =
  | { id: string; type: 'booking'; date: string; time: string; title: string; status: string; bookingId: string }
  | { id: string; type: 'google'; date: string; time: string; title: string; allDay: boolean };

interface GoogleEventsResponse {
  connected: boolean;
  events: { id: string; summary: string; start: string; end: string; allDay: boolean }[];
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdToDate(value: string) {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (![y, m, d].every(n => Number.isFinite(n))) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function mondayIndex(d: Date) {
  const js = d.getDay();
  return (js + 6) % 7;
}

function buildMonthGrid(month: Date) {
  const first = startOfMonth(month);
  const offset = mondayIndex(first);
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - offset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

function timeFromIsoLike(value: string) {
  if (!value) return '';
  if (value.includes('T')) {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    const hh = `${dt.getHours()}`.padStart(2, '0');
    const mm = `${dt.getMinutes()}`.padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '';
}

function dateFromIsoLike(value: string) {
  if (!value) return '';
  if (!value.includes('T')) return value;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return ymd(dt);
}

export default function Bookings({ fetcher }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleEventsResponse['events']>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('admin.bookings.viewMode') : null;
    return stored === 'list' ? 'list' : 'calendar';
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'cancelled'>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('admin.bookings.statusFilter') : null;
    if (stored === 'pending' || stored === 'accepted' || stored === 'rejected' || stored === 'cancelled') return stored;
    return 'all';
  });
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'domestic' | 'commercial'>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('admin.bookings.categoryFilter') : null;
    if (stored === 'domestic' || stored === 'commercial') return stored;
    return 'all';
  });
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(() => ymd(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [slotCount, setSlotCount] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const bookingIdFromUrl = new URLSearchParams(window.location.search).get('bookingId');
  const deepLinkedBooking = bookingIdFromUrl ? bookings.find(b => b._id === bookingIdFromUrl) : null;
  const deepLinkedMonth = deepLinkedBooking ? ymdToDate(deepLinkedBooking.date) : null;
  const activeMonth = deepLinkedMonth ? startOfMonth(deepLinkedMonth) : month;
  const activeSelectedDay = deepLinkedBooking ? deepLinkedBooking.date : selectedDay;
  const activeMonthKey = activeMonth.getFullYear() * 12 + activeMonth.getMonth();

  const clearBookingIdFromUrl = () => {
    if (!bookingIdFromUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('bookingId');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  const fetchBookings = async () => {
    const res = await fetcher(`${API_BASE}/admin/bookings`);
    const json = (await res.json()) as unknown;
    setBookings(Array.isArray(json) ? (json as Booking[]) : []);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const bookingsRes = await fetcher(`${API_BASE}/admin/bookings`);
      const bookingsJson = (await bookingsRes.json()) as unknown;
      if (cancelled) return;
      setBookings(Array.isArray(bookingsJson) ? (bookingsJson as Booking[]) : []);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;

    async function loadGoogle() {
      if (viewMode !== 'calendar') return;
      const year = Math.floor(activeMonthKey / 12);
      const monthIndex = activeMonthKey % 12;
      const monthStart = new Date(year, monthIndex, 1);
      const grid = buildMonthGrid(monthStart);
      const start = ymd(grid[0]);
      const endExclusive = ymd(new Date(grid[41].getFullYear(), grid[41].getMonth(), grid[41].getDate() + 1));

      const googleRes = await fetcher(`${API_BASE}/admin/google/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(endExclusive)}`);
      const googleJson = (await googleRes.json()) as unknown;
      if (cancelled) return;

      if (googleJson && typeof googleJson === 'object') {
        const g = googleJson as Record<string, unknown>;
        const connected = typeof g.connected === 'boolean' ? g.connected : false;
        const events = Array.isArray(g.events) ? (g.events as GoogleEventsResponse['events']) : [];
        setGoogleConnected(connected);
        setGoogleEvents(events);
      } else {
        setGoogleConnected(false);
        setGoogleEvents([]);
      }
    }

    void loadGoogle();

    return () => {
      cancelled = true;
    };
  }, [fetcher, activeMonthKey, viewMode]);

  const visibleBookings = bookings.filter(b => b.status === 'pending' || b.status === 'accepted');

  const items: CalendarItem[] = [
    ...visibleBookings.map(b => ({
      id: `booking:${b._id}`,
      type: 'booking' as const,
      date: b.date,
      time: b.timeSlot,
      title: b.fullName,
      status: b.status,
      bookingId: b._id
    })),
    ...googleEvents.map(e => ({
      id: `google:${e.id}`,
      type: 'google' as const,
      date: dateFromIsoLike(e.start),
      time: timeFromIsoLike(e.start),
      title: e.summary || 'Busy',
      allDay: Boolean(e.allDay)
    }))
  ].filter(i => i.date);

  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const arr = itemsByDate.get(item.date) || [];
    arr.push(item);
    itemsByDate.set(item.date, arr);
  }
  for (const [key, arr] of itemsByDate.entries()) {
    arr.sort((a, b) => {
      const ta = a.type === 'google' && a.allDay ? '00:00' : a.time || '00:00';
      const tb = b.type === 'google' && b.allDay ? '00:00' : b.time || '00:00';
      return ta.localeCompare(tb);
    });
    itemsByDate.set(key, arr);
  }

  const handleOpenModal = (id: string, status: string) => {
    setUpdatingId(id);
    setUpdatingStatus(status);
    setAdminNote('');
    setEstimatedArrival('');
    setSlotCount(1);
    setIsModalOpen(true);
  };

  const confirmUpdate = async () => {
    if (!updatingId || !updatingStatus) return;

    await fetcher(`${API_BASE}/admin/bookings/${updatingId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: updatingStatus, adminNote, estimatedArrival, slotCount })
    });

    setIsModalOpen(false);
    setUpdatingId(null);
    setUpdatingStatus(null);
    void fetchBookings();
  };

  useEffect(() => {
    window.localStorage.setItem('admin.bookings.viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    window.localStorage.setItem('admin.bookings.statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    window.localStorage.setItem('admin.bookings.categoryFilter', categoryFilter);
  }, [categoryFilter]);

  const listBookings = useMemo(() => {
    const filtered = bookings.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && bookingCategory(b) !== categoryFilter) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const keyA = `${a.date} ${a.timeSlot}`;
      const keyB = `${b.date} ${b.timeSlot}`;
      return keyB.localeCompare(keyA);
    });
    return filtered;
  }, [bookings, statusFilter, categoryFilter]);

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Booking Management</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('list')}
            style={viewMode === 'list' ? { background: 'var(--accent)', color: '#000' } : undefined}
          >
            List View
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('calendar')}
            style={viewMode === 'calendar' ? { background: 'var(--accent)', color: '#000' } : undefined}
          >
            Calendar View
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="card bookings-calendar">
          <div className="bookings-calendar-header">
            <div className="bookings-calendar-nav">
              <button type="button" className="btn" onClick={() => { clearBookingIdFromUrl(); setMonth(addMonths(activeMonth, -1)); }}>Prev</button>
              <button type="button" className="btn" onClick={() => { clearBookingIdFromUrl(); setMonth(startOfMonth(new Date())); }}>Today</button>
              <button type="button" className="btn" onClick={() => { clearBookingIdFromUrl(); setMonth(addMonths(activeMonth, 1)); }}>Next</button>
            </div>
            <div className="bookings-calendar-title">
              {activeMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <div className="bookings-calendar-meta">
              Google: {googleConnected ? 'Connected' : 'Not connected'}
            </div>
          </div>

          <div className="bookings-calendar-scroll">
            <div className="bookings-calendar-weekdays">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="bookings-calendar-weekday">{d}</div>
              ))}
            </div>

            <div className="bookings-calendar-grid">
              {buildMonthGrid(activeMonth).map(d => {
                const date = ymd(d);
                const dayItems = itemsByDate.get(date) || [];
                const inMonth = d.getMonth() === activeMonth.getMonth();
                const isSelected = activeSelectedDay === date;
                const pendingCount = dayItems.filter(i => i.type === 'booking' && i.status === 'pending').length;
                const acceptedCount = dayItems.filter(i => i.type === 'booking' && i.status === 'accepted').length;
                const googleCount = dayItems.filter(i => i.type === 'google').length;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => { clearBookingIdFromUrl(); setSelectedDay(date); }}
                    className="bookings-calendar-day"
                    data-selected={isSelected}
                    data-inmonth={inMonth}
                  >
                    <div className="bookings-calendar-day-top">
                      <div className="bookings-calendar-day-number">{d.getDate()}</div>
                      <div className="bookings-calendar-badges">
                        {pendingCount > 0 && <span className="badge badge-pending bookings-calendar-badge" title={`${pendingCount} pending`}>{pendingCount} P</span>}
                        {acceptedCount > 0 && <span className="badge badge-accepted bookings-calendar-badge" title={`${acceptedCount} accepted`}>{acceptedCount} A</span>}
                        {googleCount > 0 && <span className="badge bookings-calendar-badge bookings-calendar-badge-google" title={`${googleCount} google`}>{googleCount} G</span>}
                      </div>
                    </div>
                    <div className="bookings-calendar-preview">
                      {dayItems.slice(0, 3).map(item => (
                        <div
                          key={item.id}
                          className="bookings-calendar-preview-row"
                          data-kind={item.type}
                        >
                          <span className="bookings-calendar-preview-time">
                            {item.type === 'google' && item.allDay ? 'All day' : (item.time || '--:--')}
                          </span>
                          <span className="bookings-calendar-preview-title">
                            {item.title}
                          </span>
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="bookings-calendar-preview-more">+{dayItems.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bookings-calendar-details">
            <div className="bookings-calendar-details-header">
              <div className="bookings-calendar-details-title">Details for {activeSelectedDay}</div>
              <button type="button" className="btn" onClick={fetchBookings}>Refresh</button>
            </div>

            <div className="bookings-calendar-details-list">
              {(itemsByDate.get(activeSelectedDay) || []).length === 0 && (
                <div className="bookings-calendar-empty">No items for this day.</div>
              )}

              {(itemsByDate.get(activeSelectedDay) || []).map(item => {
                if (item.type === 'google') {
                  return (
                    <div key={item.id} className="bookings-calendar-item">
                      <div className="bookings-calendar-item-main">
                        <div className="bookings-calendar-item-title">{item.title || 'Busy'}</div>
                        <div className="bookings-calendar-item-subtitle">
                          {item.allDay ? 'All day' : item.time} · Google Calendar
                        </div>
                      </div>
                    </div>
                  );
                }

                const booking = bookings.find(b => b._id === item.bookingId);
                return (
                  <div key={item.id} className="bookings-calendar-item">
                    <div className="bookings-calendar-item-main">
                      <div className="bookings-calendar-item-row">
                        <div className="bookings-calendar-item-title">{item.title}</div>
                        <span className={`badge badge-${item.status}`}>{item.status}</span>
                      </div>
                      <div className="bookings-calendar-item-subtitle">
                        {item.time} · {booking?.email || ''}
                        {booking?.jobType && <> · {booking.jobType}</>}
                        {(booking?.slotCount ?? 1) > 1 && <> · {booking?.slotCount} slots</>}
                        {booking?.address && <> · {booking.address}</>}
                      </div>
                    </div>
                    <div className="bookings-calendar-item-actions">
                      {item.status === 'pending' && (
                        <>
                          <button onClick={() => handleOpenModal(item.bookingId, 'accepted')} className="btn btn-success" title="Accept"><Check size={18} /></button>
                          <button onClick={() => handleOpenModal(item.bookingId, 'rejected')} className="btn btn-danger" title="Reject"><X size={18} /></button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={() => setStatusFilter('all')} style={statusFilter === 'all' ? { background: 'var(--accent)', color: '#000' } : undefined}>All</button>
                <button type="button" className="btn" onClick={() => setStatusFilter('pending')} style={statusFilter === 'pending' ? { background: 'var(--accent)', color: '#000' } : undefined}>Pending</button>
                <button type="button" className="btn" onClick={() => setStatusFilter('accepted')} style={statusFilter === 'accepted' ? { background: 'var(--accent)', color: '#000' } : undefined}>Accepted</button>
                <button type="button" className="btn" onClick={() => setStatusFilter('rejected')} style={statusFilter === 'rejected' ? { background: 'var(--accent)', color: '#000' } : undefined}>Rejected</button>
                <button type="button" className="btn" onClick={() => setStatusFilter('cancelled')} style={statusFilter === 'cancelled' ? { background: 'var(--accent)', color: '#000' } : undefined}>Cancelled</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={() => setCategoryFilter('all')} style={categoryFilter === 'all' ? { background: 'rgba(255,255,255,0.15)', color: 'var(--text-main)' } : undefined}>All Types</button>
                <button type="button" className="btn" onClick={() => setCategoryFilter('domestic')} style={categoryFilter === 'domestic' ? { background: 'rgba(255,255,255,0.15)', color: 'var(--text-main)' } : undefined}>Domestic</button>
                <button type="button" className="btn" onClick={() => setCategoryFilter('commercial')} style={categoryFilter === 'commercial' ? { background: 'rgba(255,255,255,0.15)', color: 'var(--text-main)' } : undefined}>Commercial</button>
              </div>
            </div>
            <button type="button" className="btn" onClick={fetchBookings}>Refresh</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {listBookings.length === 0 && (
              <div style={{ color: 'var(--text-gray)' }}>No bookings found.</div>
            )}

            {listBookings.map(b => {
              const isDeepLinked = bookingIdFromUrl ? b._id === bookingIdFromUrl : false;
              return (
                <div
                  key={b._id}
                  className="card"
                  style={{
                    margin: 0,
                    background: isDeepLinked ? 'rgba(233, 226, 68, 0.08)' : undefined,
                    borderColor: isDeepLinked ? 'rgba(233, 226, 68, 0.35)' : undefined
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 800 }}>{b.fullName}</div>
                        <span className={`badge badge-${b.status}`}>{b.status}</span>
                        <span className="badge" style={{ background: bookingCategory(b) === 'commercial' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)', color: bookingCategory(b) === 'commercial' ? '#a78bfa' : '#34d399', border: 'none' }}>{bookingCategory(b) === 'commercial' ? 'Commercial' : 'Domestic'}</span>
                        {(b.slotCount ?? 1) > 1 && <span className="badge" style={{ background: 'rgba(233,226,68,0.15)', color: 'var(--accent)', border: 'none' }}>{b.slotCount} slots</span>}
                      </div>
                      <div style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>{b.email}</div>
                      {b.jobType && <div style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>{b.jobType}</div>}
                      {b.address && <div style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>{b.address}</div>}
                      <div style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
                        {b.date} · {b.timeSlot}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => handleOpenModal(b._id, 'accepted')} className="btn btn-success" title="Accept"><Check size={18} /></button>
                          <button onClick={() => handleOpenModal(b._id, 'rejected')} className="btn btn-danger" title="Reject"><X size={18} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

            {updatingStatus === 'accepted' && (
              <>
                <div className="form-group">
                  <label>Job Duration (slots)</label>
                  <select value={slotCount} onChange={(e) => setSlotCount(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'slot' : 'slots'}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Arrival Time</label>
                  <input
                    type="time"
                    value={estimatedArrival}
                    onChange={(e) => setEstimatedArrival(e.target.value)}
                  />
                </div>
              </>
            )}

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
