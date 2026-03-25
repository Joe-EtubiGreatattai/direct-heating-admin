import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const API = 'https://direct-heating.duckdns.org/api';

interface ServiceItem {
  _id: string;
  title: string;
  description: string;
  link: string;
  cta: string;
  label: string;
  isExternal: boolean;
  iconName: string;
  order: number;
  active: boolean;
}

const emptyForm = { title: '', description: '', link: '/contact', cta: 'Learn More', label: '', isExternal: false, iconName: 'wrench', active: true };

interface Props {
  fetcher: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function ServicesManager({ fetcher }: Props) {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetcher(`${API}/admin/cms/services`);
      setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(item: ServiceItem) {
    setEditing(item);
    setForm({ title: item.title, description: item.description, link: item.link, cta: item.cta, label: item.label, isExternal: item.isExternal, iconName: item.iconName, active: item.active });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        const res = await fetcher(`${API}/admin/cms/services/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
        const updated = await res.json();
        setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      } else {
        const res = await fetcher(`${API}/admin/cms/services`, { method: 'POST', body: JSON.stringify(form) });
        const created = await res.json();
        setItems(prev => [...prev, created]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this service?')) return;
    await fetcher(`${API}/admin/cms/services/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i._id !== id));
  }

  async function handleToggle(item: ServiceItem) {
    const res = await fetcher(`${API}/admin/cms/services/${item._id}`, { method: 'PUT', body: JSON.stringify({ active: !item.active }) });
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-meta">
          <h1>Services</h1>
          <p>{items.filter(i => i.active).length} active · {items.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Service</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map(item => (
          <div key={item._id} className="card" style={{ opacity: item.active ? 1 : 0.5 }}>
            <div className="item-row">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem' }}>{item.title}</strong>
                  {item.label && <span style={{ background: 'rgba(233,226,68,0.15)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</span>}
                  {!item.active && <span style={{ color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 700 }}>HIDDEN</span>}
                </div>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>{item.description}</p>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-gray)' }}>
                  <span>CTA: <strong style={{ color: 'var(--text-main)' }}>{item.cta}</strong></span>
                  <span>Link: <strong style={{ color: 'var(--text-main)' }}>{item.link}</strong></span>
                  {item.isExternal && <span style={{ color: 'var(--accent)' }}>External link</span>}
                </div>
              </div>
              <div className="item-actions">
                <button className="btn" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }} onClick={() => openEdit(item)} title="Edit"><Edit2 size={15} /></button>
                <button className="btn" style={{ padding: '0.5rem', background: item.active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${item.active ? 'var(--warning)' : 'var(--success)'}`, color: item.active ? 'var(--warning)' : 'var(--success)' }} onClick={() => handleToggle(item)} title={item.active ? 'Hide' : 'Show'}>{item.active ? <X size={15} /> : <Check size={15} />}</button>
                <button className="btn" style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={() => handleDelete(item._id)} title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="card" style={{ width: '580px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editing ? 'Edit Service' : 'Add Service'}</h2>

            <div className="form-group">
              <label>Service Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Boiler Installation" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this service..." rows={3} style={{ resize: 'vertical' }} />
            </div>

            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>CTA Button Text</label>
                <input value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))} placeholder="e.g. Get Quote" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Badge Label (optional)</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Premium" />
              </div>
            </div>

            <div style={{ height: '1rem' }} />
            <div className="form-group">
              <label>Link URL</label>
              <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="/contact or tel:02046008746" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input type="checkbox" id="isExternal" checked={form.isExternal} onChange={e => setForm(f => ({ ...f, isExternal: e.target.checked }))} style={{ width: 'auto' }} />
              <label htmlFor="isExternal" style={{ marginBottom: 0, cursor: 'pointer' }}>External link (phone, WhatsApp, etc.)</label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-gray)', border: '1px solid var(--card-border)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title || !form.description}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Service'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
