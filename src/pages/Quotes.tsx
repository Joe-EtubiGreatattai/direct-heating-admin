import { useMemo, useState, useEffect } from 'react';
import { User, Mail, Briefcase, Calendar, Phone, X } from 'lucide-react';

const API_BASE = 'https://direct-heating.duckdns.org/api';

type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

interface Quote {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  customerType: string;
  message?: string;
  createdAt: string;
  status: string;
}

interface Props {
  fetcher: Fetcher;
}

interface GoogleEventsResponse {
  connected: boolean;
  events: { id: string; summary: string; start: string; end: string; allDay: boolean }[];
}

function isGoogleEventsResponse(value: unknown): value is GoogleEventsResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.connected !== 'boolean') return false;
  if (!Array.isArray(v.events)) return false;
  return true;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeFromDate(d: Date) {
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mm = `${d.getMinutes()}`.padStart(2, '0');
  return `${hh}:${mm}`;
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
    return timeFromDate(dt);
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

export default function Quotes({ fetcher }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleEventsResponse['events']>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('admin.quotes.viewMode') : null;
    return stored === 'calendar' ? 'calendar' : 'list';
  });
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(() => ymd(new Date()));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetcher(`${API_BASE}/admin/quotes`);
      const json = (await res.json()) as unknown;
      if (cancelled) return;
      setQuotes(Array.isArray(json) ? (json as Quote[]) : []);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const quoteIdFromUrl = new URLSearchParams(window.location.search).get('quoteId');
  const deepLinkedQuote = quoteIdFromUrl ? quotes.find((q) => q._id === quoteIdFromUrl) : null;
  const activeQuote = selected || deepLinkedQuote;
  const deepLinkedDay = deepLinkedQuote ? ymd(new Date(deepLinkedQuote.createdAt)) : null;
  const deepLinkedMonth = deepLinkedQuote ? startOfMonth(new Date(deepLinkedQuote.createdAt)) : null;
  const activeMonth = deepLinkedMonth ? deepLinkedMonth : month;
  const activeSelectedDay = deepLinkedDay ? deepLinkedDay : selectedDay;
  const activeMonthKey = activeMonth.getFullYear() * 12 + activeMonth.getMonth();

  const closeModal = () => {
    setSelected(null);
    if (!quoteIdFromUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('quoteId');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  const clearQuoteIdFromUrl = () => {
    if (!quoteIdFromUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('quoteId');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  useEffect(() => {
    window.localStorage.setItem('admin.quotes.viewMode', viewMode);
  }, [viewMode]);

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

      if (isGoogleEventsResponse(googleJson)) {
        setGoogleConnected(Boolean(googleJson.connected));
        setGoogleEvents(Array.isArray(googleJson.events) ? googleJson.events : []);
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

  type CalendarItem =
    | { id: string; type: 'quote'; date: string; time: string; title: string; status: string; quoteId: string; email: string; createdAt: string }
    | { id: string; type: 'google'; date: string; time: string; title: string; allDay: boolean };

  const itemsByDate = useMemo(() => {
    const items: CalendarItem[] = [
      ...quotes.map(q => {
        const dt = new Date(q.createdAt);
        return {
          id: `quote:${q._id}`,
          type: 'quote' as const,
          date: ymd(dt),
          time: timeFromDate(dt),
          title: `${q.firstName} ${q.lastName}`,
          status: q.status,
          quoteId: q._id,
          email: q.email,
          createdAt: q.createdAt
        };
      }),
      ...googleEvents.map(e => ({
        id: `google:${e.id}`,
        type: 'google' as const,
        date: dateFromIsoLike(e.start),
        time: timeFromIsoLike(e.start),
        title: e.summary || 'Busy',
        allDay: Boolean(e.allDay)
      }))
    ].filter(i => i.date);

    const byDate = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const arr = byDate.get(item.date) || [];
      arr.push(item);
      byDate.set(item.date, arr);
    }
    for (const [key, arr] of byDate.entries()) {
      arr.sort((a, b) => {
        const ta = a.type === 'google' && a.allDay ? '00:00' : a.time || '00:00';
        const tb = b.type === 'google' && b.allDay ? '00:00' : b.time || '00:00';
        if (ta !== tb) return ta.localeCompare(tb);
        const ca = a.type === 'quote' ? a.createdAt : '';
        const cb = b.type === 'quote' ? b.createdAt : '';
        return cb.localeCompare(ca);
      });
      byDate.set(key, arr);
    }
    return byDate;
  }, [googleEvents, quotes]);

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Quote Inquiries</h1>
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

      {viewMode === 'list' ? (
        <div className="card table-card">
          <table style={{ minWidth: '720px' }}>
            <thead>
              <tr>
                <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> Customer</div></th>
                <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={14} /> Service</div></th>
                <th><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} /> Date</div></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q._id} onClick={() => setSelected(q)} style={{ cursor: 'pointer' }}>
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
      ) : (
        <div className="card bookings-calendar">
          <div className="bookings-calendar-header">
            <div className="bookings-calendar-nav">
              <button type="button" className="btn" onClick={() => { clearQuoteIdFromUrl(); setMonth(addMonths(activeMonth, -1)); }}>Prev</button>
              <button type="button" className="btn" onClick={() => { clearQuoteIdFromUrl(); setMonth(startOfMonth(new Date())); }}>Today</button>
              <button type="button" className="btn" onClick={() => { clearQuoteIdFromUrl(); setMonth(addMonths(activeMonth, 1)); }}>Next</button>
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
                const quoteCount = dayItems.filter(i => i.type === 'quote').length;
                const googleCount = dayItems.filter(i => i.type === 'google').length;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => { clearQuoteIdFromUrl(); setSelectedDay(date); }}
                    className="bookings-calendar-day"
                    data-selected={isSelected}
                    data-inmonth={inMonth}
                  >
                    <div className="bookings-calendar-day-top">
                      <div className="bookings-calendar-day-number">{d.getDate()}</div>
                      <div className="bookings-calendar-badges">
                        {quoteCount > 0 && (
                          <span className="badge bookings-calendar-badge" title={`${quoteCount} enquiries`}>
                            {quoteCount}
                          </span>
                        )}
                        {googleCount > 0 && (
                          <span className="badge bookings-calendar-badge bookings-calendar-badge-google" title={`${googleCount} google`}>
                            {googleCount} G
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bookings-calendar-preview">
                      {dayItems.slice(0, 3).map(item => (
                        <div
                          key={item.id}
                          className="bookings-calendar-preview-row"
                          data-kind={item.type === 'google' ? 'google' : 'booking'}
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
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const res = await fetcher(`${API_BASE}/admin/quotes`);
                  const json = (await res.json()) as unknown;
                  setQuotes(Array.isArray(json) ? (json as Quote[]) : []);
                }}
              >
                Refresh
              </button>
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

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="bookings-calendar-item"
                    onClick={() => setSelected(quotes.find(q => q._id === item.quoteId) || null)}
                    style={{ textAlign: 'left' }}
                  >
                    <div className="bookings-calendar-item-main">
                      <div className="bookings-calendar-item-row">
                        <div className="bookings-calendar-item-title">{item.title}</div>
                        <span className={`badge badge-${item.status}`}>{item.status}</span>
                      </div>
                      <div className="bookings-calendar-item-subtitle">
                        {item.time} · {item.email}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeQuote && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{
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
          }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(233, 226, 68, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--accent)' }}>
                  <User size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{activeQuote.firstName} {activeQuote.lastName}</h2>
                  <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${activeQuote.status}`}>{activeQuote.status}</span>
                    <span style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>{new Date(activeQuote.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn"
                onClick={closeModal}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-main)', padding: '0.5rem' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ color: 'var(--text-gray)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{activeQuote.email}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ color: 'var(--text-gray)', fontSize: '0.8rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={14} /> Phone</div>
                  <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{activeQuote.phone}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ color: 'var(--text-gray)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Service</div>
                  <div style={{ fontWeight: 600 }}>{activeQuote.service}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ color: 'var(--text-gray)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Customer Type</div>
                  <div style={{ fontWeight: 600 }}>{activeQuote.customerType}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ color: 'var(--text-gray)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Message</div>
                <div style={{ color: 'var(--text-main)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {activeQuote.message && activeQuote.message.trim().length > 0 ? activeQuote.message : 'No message provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
