import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const API = 'https://direct-heating.duckdns.org/api';

interface Testimonial {
  _id: string;
  name: string;
  initials: string;
  review: string;
  badge: string;
  rating: number;
  order: number;
  active: boolean;
}

const emptyForm = { name: '', initials: '', review: '', badge: 'Verified Customer', rating: 5, active: true };

interface Props {
  fetcher: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function TestimonialsManager({ fetcher }: Props) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    try {
      const res = await fetcher(`${API}/admin/cms/testimonials`);
      setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(item: Testimonial) {
    setEditing(item);
    setForm({ name: item.name, initials: item.initials, review: item.review, badge: item.badge, rating: item.rating, active: item.active });
    setShowModal(true);
  }

  function autoInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        const res = await fetcher(`${API}/admin/cms/testimonials/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
        const updated = await res.json();
        setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      } else {
        const res = await fetcher(`${API}/admin/cms/testimonials`, { method: 'POST', body: JSON.stringify(form) });
        const created = await res.json();
        setItems(prev => [...prev, created]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this testimonial?')) return;
    await fetcher(`${API}/admin/cms/testimonials/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i._id !== id));
  }

  async function handleToggle(item: Testimonial) {
    const res = await fetcher(`${API}/admin/cms/testimonials/${item._id}`, { method: 'PUT', body: JSON.stringify({ active: !item.active }) });
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Testimonials</h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>{items.filter(i => i.active).length} active · {items.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Testimonial</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map(item => (
          <div key={item._id} className="card" style={{ opacity: item.active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', flexShrink: 0, fontSize: '0.9rem' }}>
                {item.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <strong>{item.name}</strong>
                  <span style={{ color: '#f59e0b' }}>{'★'.repeat(item.rating)}</span>
                  <span style={{ background: 'rgba(201,169,98,0.15)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{item.badge}</span>
                  {!item.active && <span style={{ color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 700 }}>HIDDEN</span>}
                </div>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', lineHeight: 1.6 }}>&ldquo;{item.review}&rdquo;</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button className="btn" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }} onClick={() => openEdit(item)} title="Edit"><Edit2 size={15} /></button>
                <button className="btn" style={{ padding: '0.5rem', background: item.active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${item.active ? 'var(--warning)' : 'var(--success)'}`, color: item.active ? 'var(--warning)' : 'var(--success)' }} onClick={() => handleToggle(item)} title={item.active ? 'Hide' : 'Show'}>{item.active ? <X size={15} /> : <Check size={15} />}</button>
                <button className="btn" style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={() => handleDelete(item._id)} title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '560px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editing ? 'Edit Testimonial' : 'Add Testimonial'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Customer Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, initials: autoInitials(e.target.value) }))} placeholder="e.g. John Smith" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Initials</label>
                <input value={form.initials} onChange={e => setForm(f => ({ ...f, initials: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="JS" maxLength={2} />
              </div>
            </div>

            <div style={{ height: '1rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Badge / Location</label>
                <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="e.g. Verified Customer" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Rating (1–5)</label>
                <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: +e.target.value }))}>
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            <div style={{ height: '1rem' }} />
            <div className="form-group">
              <label>Review Text</label>
              <textarea value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} placeholder="The customer's review..." rows={5} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-gray)', border: '1px solid var(--card-border)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.review}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Testimonial'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
