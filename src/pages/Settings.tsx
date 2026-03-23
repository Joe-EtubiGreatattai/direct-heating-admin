import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Clock, Hourglass } from 'lucide-react';

const API_BASE = 'https://direct-heating.duckdns.org/api';

type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

interface BookingSettings {
  openingTime: string;
  closingTime: string;
  slotDuration: number;
}

interface Props {
  fetcher: Fetcher;
}

export default function Settings({ fetcher }: Props) {
  const [settings, setSettings] = useState<BookingSettings>({ openingTime: '08:00', closingTime: '18:00', slotDuration: 60 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetcher(`${API_BASE}/admin/settings`);
      const json = (await res.json()) as unknown;
      if (cancelled) return;
      if (json && typeof json === 'object') setSettings(json as BookingSettings);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

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

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <h1>System Settings</h1>
      <div className="card" style={{ maxWidth: '600px', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(201, 169, 98, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--accent)' }}>
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

          <div className="form-group">
            <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Hourglass size={14} /> Slot Duration</div></label>
            <select value={settings.slotDuration} onChange={e => setSettings({ ...settings, slotDuration: parseInt(e.target.value) })}>
              <option value="30">30 Minutes (Fast Service)</option>
              <option value="60">1 Hour (Standard Service)</option>
              <option value="90">1.5 Hours (Deep Service)</option>
              <option value="120">2 Hours (Extended Service)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', height: '50px' }} disabled={loading}>
            {loading ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
