import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Clock, Hourglass, Calendar } from 'lucide-react';

const API_BASE = 'https://direct-heating.duckdns.org/api';

type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

interface FixedSlot {
  time: string;
  label: string;
}

interface BookingSettings {
  openingTime: string;
  closingTime: string;
  slotDuration: number;
  useFixedSlots: boolean;
  fixedSlots: FixedSlot[];
  workingDays: number[];
  unavailableDates: string[];
}

interface Props {
  fetcher: Fetcher;
}

interface GoogleCalendarAccount {
  id: string;
  email: string;
  calendarId: string;
  timeZone: string;
  enabled: boolean;
}

interface GoogleCalendarStatus {
  connected: boolean;
  accounts: GoogleCalendarAccount[];
}

interface GoogleCalendarSyncResult {
  connected: boolean;
  attempted: number;
  updated: number;
  skippedPast: number;
  skippedRejected: number;
  failed: number;
}

function isGoogleCalendarStatus(value: unknown): value is GoogleCalendarStatus {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.connected !== 'boolean') return false;
  if (!Array.isArray(v.accounts)) return false;
  return v.accounts.every((a) => {
    if (!a || typeof a !== 'object') return false;
    const r = a as Record<string, unknown>;
    return typeof r.id === 'string'
      && typeof r.email === 'string'
      && typeof r.calendarId === 'string'
      && typeof r.timeZone === 'string'
      && typeof r.enabled === 'boolean';
  });
}

function isGoogleCalendarSyncResult(value: unknown): value is GoogleCalendarSyncResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.connected === 'boolean'
    && typeof v.attempted === 'number'
    && typeof v.updated === 'number'
    && typeof v.skippedPast === 'number'
    && typeof v.skippedRejected === 'number'
    && typeof v.failed === 'number';
}

function getUrlFromJson(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const v = value as Record<string, unknown>;
  return typeof v.url === 'string' ? v.url : '';
}

function asNumberArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const numbers = value.map(v => (typeof v === 'number' ? v : Number.NaN)).filter(n => Number.isFinite(n));
  return numbers.length ? numbers : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(v => typeof v === 'string');
}

export default function Settings({ fetcher }: Props) {
  const [settings, setSettings] = useState<BookingSettings>({
    openingTime: '08:00',
    closingTime: '18:00',
    slotDuration: 60,
    useFixedSlots: true,
    fixedSlots: [
      { time: '08:00', label: 'Morning (8am-12pm) - Slot 1' },
      { time: '10:00', label: 'Morning (8am-12pm) - Slot 2' },
      { time: '12:00', label: 'Afternoon (12pm-5pm) - Slot 1' },
      { time: '14:30', label: 'Afternoon (12pm-5pm) - Slot 2' }
    ],
    workingDays: [1, 2, 3, 4, 5, 6, 7],
    unavailableDates: []
  });
  const [loading, setLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleSyncLoading, setGoogleSyncLoading] = useState(false);
  const [googleAccountBusyId, setGoogleAccountBusyId] = useState<string | null>(null);
  const [newUnavailableDate, setNewUnavailableDate] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetcher(`${API_BASE}/admin/settings`);
      const json = (await res.json()) as unknown;
      if (cancelled) return;
      if (json && typeof json === 'object') {
        const v = json as Record<string, unknown>;
        setSettings({
          openingTime: typeof v.openingTime === 'string' ? v.openingTime : '08:00',
          closingTime: typeof v.closingTime === 'string' ? v.closingTime : '18:00',
          slotDuration: typeof v.slotDuration === 'number' ? v.slotDuration : 60,
          useFixedSlots: typeof v.useFixedSlots === 'boolean' ? v.useFixedSlots : true,
          fixedSlots: Array.isArray(v.fixedSlots) ? v.fixedSlots : [],
          workingDays: asNumberArray(v.workingDays, [1, 2, 3, 4, 5, 6, 7]),
          unavailableDates: asStringArray(v.unavailableDates)
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;

    async function loadGoogleStatus() {
      const res = await fetcher(`${API_BASE}/admin/google/status`);
      const json = (await res.json()) as unknown;
      if (cancelled) return;
      if (isGoogleCalendarStatus(json)) setGoogleStatus(json);
    }

    void loadGoogleStatus();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const refreshGoogleStatus = async () => {
    setGoogleLoading(true);
    const res = await fetcher(`${API_BASE}/admin/google/status`);
    const json = (await res.json()) as unknown;
    if (isGoogleCalendarStatus(json)) setGoogleStatus(json);
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetcher(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    setLoading(false);
    alert('Settings updated successfully');
  };

  const weekdayOptions = [
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 7 }
  ];

  const toggleWorkingDay = (day: number) => {
    setSettings((prev) => {
      const next = prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day];
      next.sort((a, b) => a - b);
      return { ...prev, workingDays: next };
    });
  };

  const addUnavailableDate = () => {
    const value = newUnavailableDate.trim();
    if (!value) return;
    setSettings((prev) => {
      if (prev.unavailableDates.includes(value)) return prev;
      const next = [...prev.unavailableDates, value].sort();
      return { ...prev, unavailableDates: next };
    });
    setNewUnavailableDate('');
  };

  const removeUnavailableDate = (value: string) => {
    setSettings((prev) => ({ ...prev, unavailableDates: prev.unavailableDates.filter(d => d !== value) }));
  };

  const handleGoogleConnect = async () => {
    setGoogleLoading(true);
    const res = await fetcher(`${API_BASE}/admin/google/connect`);
    const json = (await res.json()) as unknown;
    setGoogleLoading(false);

    const url = getUrlFromJson(json);
    if (!url) {
      alert('Could not start Google Calendar connection');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleGoogleSync = async () => {
    setGoogleSyncLoading(true);
    try {
      const res = await fetcher(`${API_BASE}/admin/google/sync`, { method: 'POST' });
      const json = (await res.json()) as unknown;
      if (!isGoogleCalendarSyncResult(json)) {
        alert('Sync completed but returned an unexpected response');
        return;
      }
      alert(`Sync complete: updated ${json.updated}/${json.attempted} (skipped past ${json.skippedPast}, failed ${json.failed})`);
    } finally {
      setGoogleSyncLoading(false);
    }
  };

  const toggleGoogleAccount = async (id: string, enabled: boolean) => {
    setGoogleAccountBusyId(id);
    try {
      await fetcher(`${API_BASE}/admin/google/accounts/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      });
      await refreshGoogleStatus();
    } finally {
      setGoogleAccountBusyId(null);
    }
  };

  const removeGoogleAccount = async (id: string) => {
    if (!window.confirm('Remove this Google account connection?')) return;
    setGoogleAccountBusyId(id);
    try {
      await fetcher(`${API_BASE}/admin/google/accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      await refreshGoogleStatus();
    } finally {
      setGoogleAccountBusyId(null);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <h1>System Settings</h1>
      <div className="card" style={{ maxWidth: '600px', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(233, 226, 68, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--accent)' }}>
            <SettingsIcon size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Booking Parameters</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Configure how customers book services on the website.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid-2" style={{ gap: '1.5rem' }}>
            <div className="form-group">
              <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} /> Opening Time</div></label>
              <input type="time" value={settings.openingTime} onChange={e => setSettings({ ...settings, openingTime: e.target.value })} />
            </div>
            <div className="form-group">
              <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} /> Closing Time</div></label>
              <input type="time" value={settings.closingTime} onChange={e => setSettings({ ...settings, closingTime: e.target.value })} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.useFixedSlots}
                onChange={e => setSettings({ ...settings, useFixedSlots: e.target.checked })}
                style={{ width: 'auto', marginRight: '8px' }}
              />
              Use 4 Fixed AM/PM Slots
            </label>
          </div>

          {settings.useFixedSlots ? (
            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> Configure Slots</h4>
              {settings.fixedSlots.map((slot, index) => (
                <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.8rem', alignItems: 'center' }}>
                  <input
                    type="time"
                    value={slot.time}
                    onChange={e => {
                      const next = [...settings.fixedSlots];
                      next[index] = { ...next[index], time: e.target.value };
                      setSettings({ ...settings, fixedSlots: next });
                    }}
                    style={{ flex: '0 0 120px' }}
                  />
                  <input
                    type="text"
                    value={slot.label}
                    onChange={e => {
                      const next = [...settings.fixedSlots];
                      next[index] = { ...next[index], label: e.target.value };
                      setSettings({ ...settings, fixedSlots: next });
                    }}
                    placeholder="Slot Label"
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
              <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
                These are the exactly 4 options customers will see on the booking calendar.
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Hourglass size={14} /> Slot Duration</div></label>
              <select value={settings.slotDuration} onChange={e => setSettings({ ...settings, slotDuration: parseInt(e.target.value) })}>
                <option value="30">30 Minutes (Fast Service)</option>
                <option value="60">1 Hour (Standard Service)</option>
                <option value="90">1.5 Hours (Deep Service)</option>
                <option value="120">2 Hours (Extended Service)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} /> Working Days</div></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {weekdayOptions.map((d) => {
                const active = settings.workingDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    className="btn"
                    onClick={() => toggleWorkingDay(d.value)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      height: '40px',
                      background: active ? 'rgba(233, 226, 68, 0.16)' : 'rgba(255,255,255,0.04)',
                      border: active ? '1px solid rgba(233, 226, 68, 0.55)' : '1px solid rgba(255,255,255,0.08)',
                      color: 'white'
                    }}
                    aria-pressed={active}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Customers can only book on selected days.
            </div>
          </div>

          <div className="form-group">
            <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} /> Unavailable Dates</div></label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="date"
                value={newUnavailableDate}
                onChange={(e) => setNewUnavailableDate(e.target.value)}
                style={{ flex: '1 1 220px' }}
              />
              <button
                type="button"
                className="btn"
                onClick={addUnavailableDate}
                disabled={!newUnavailableDate.trim()}
                style={{ height: '40px' }}
              >
                Add
              </button>
            </div>

            {settings.unavailableDates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                {settings.unavailableDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="btn"
                    onClick={() => removeUnavailableDate(d)}
                    style={{
                      height: '36px',
                      padding: '0.45rem 0.7rem',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'white'
                    }}
                    title="Remove date"
                  >
                    {d} <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>×</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              These dates will be blocked on the booking calendar.
            </div>
          </div>



          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', height: '50px' }} disabled={loading}>
            {loading ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: '600px', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(233, 226, 68, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--accent)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Google Calendar</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Connect multiple accounts to block availability and sync bookings.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleGoogleConnect} disabled={googleLoading}>
            {googleLoading ? 'Opening...' : 'Add Google Account'}
          </button>
          <button type="button" className="btn" onClick={refreshGoogleStatus} disabled={googleLoading}>
            {googleLoading ? 'Refreshing...' : 'Refresh Status'}
          </button>
          <button type="button" className="btn" onClick={handleGoogleSync} disabled={googleSyncLoading || googleLoading}>
            {googleSyncLoading ? 'Syncing...' : 'Sync Bookings'}
          </button>
        </div>

        <div style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
          Status: {googleStatus ? (googleStatus.connected ? `Connected (${googleStatus.accounts.filter(a => a.enabled).length})` : 'Not connected') : 'Loading...'}
        </div>

        {googleStatus && googleStatus.accounts.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {googleStatus.accounts.map((a) => {
              const busy = googleAccountBusyId === a.id || googleLoading || googleSyncLoading;
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, opacity: a.enabled ? 1 : 0.6 }}>
                      {a.email || 'Google account'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => toggleGoogleAccount(a.id, !a.enabled)}
                      style={a.enabled ? { background: 'rgba(233, 226, 68, 0.16)', border: '1px solid rgba(233, 226, 68, 0.55)', color: '#fff' } : undefined}
                    >
                      {a.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => removeGoogleAccount(a.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
