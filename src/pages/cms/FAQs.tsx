import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

const API = 'https://direct-heating.duckdns.org/api';

interface FAQItem {
  _id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
}

const emptyForm = { question: '', answer: '', active: true };

interface Props {
  fetcher: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function FAQsManager({ fetcher }: Props) {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetcher(`${API}/admin/cms/faqs`);
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

  function openEdit(item: FAQItem) {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, active: item.active });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        const res = await fetcher(`${API}/admin/cms/faqs/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
        const updated = await res.json();
        setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      } else {
        const res = await fetcher(`${API}/admin/cms/faqs`, { method: 'POST', body: JSON.stringify(form) });
        const created = await res.json();
        setItems(prev => [...prev, created]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this FAQ?')) return;
    await fetcher(`${API}/admin/cms/faqs/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i._id !== id));
  }

  async function handleToggle(item: FAQItem) {
    const res = await fetcher(`${API}/admin/cms/faqs/${item._id}`, { method: 'PUT', body: JSON.stringify({ active: !item.active }) });
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  }

  async function handleMove(item: FAQItem, direction: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(i => i._id === item._id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const newOrder = sorted[swapIdx].order;
    const swapOrder = sorted[idx].order;

    await Promise.all([
      fetcher(`${API}/admin/cms/faqs/${item._id}`, { method: 'PUT', body: JSON.stringify({ order: newOrder }) }),
      fetcher(`${API}/admin/cms/faqs/${sorted[swapIdx]._id}`, { method: 'PUT', body: JSON.stringify({ order: swapOrder }) })
    ]);

    setItems(prev => prev.map(i => {
      if (i._id === item._id) return { ...i, order: newOrder };
      if (i._id === sorted[swapIdx]._id) return { ...i, order: swapOrder };
      return i;
    }));
  }

  const sorted = [...items].sort((a, b) => a.order - b.order);

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-meta">
          <h1>FAQs</h1>
          <p>{items.filter(i => i.active).length} active · {items.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add FAQ</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sorted.map((item, idx) => (
          <div key={item._id} className="card" style={{ opacity: item.active ? 1 : 0.5 }}>
            <div className="item-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                <button style={{ background: 'none', border: '1px solid var(--card-border)', color: 'var(--text-gray)', borderRadius: '6px', cursor: 'pointer', padding: '2px 4px' }} onClick={() => handleMove(item, -1)} disabled={idx === 0}><ChevronUp size={14} /></button>
                <button style={{ background: 'none', border: '1px solid var(--card-border)', color: 'var(--text-gray)', borderRadius: '6px', cursor: 'pointer', padding: '2px 4px' }} onClick={() => handleMove(item, 1)} disabled={idx === sorted.length - 1}><ChevronDown size={14} /></button>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{item.question}</strong>
                  {!item.active && <span style={{ color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 700 }}>HIDDEN</span>}
                </div>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.88rem', lineHeight: 1.6 }}>{item.answer}</p>
              </div>
              <div className="item-actions">
                <button className="btn" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }} onClick={() => openEdit(item)}><Edit2 size={15} /></button>
                <button className="btn" style={{ padding: '0.5rem', background: item.active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${item.active ? 'var(--warning)' : 'var(--success)'}`, color: item.active ? 'var(--warning)' : 'var(--success)' }} onClick={() => handleToggle(item)}>{item.active ? <X size={15} /> : <Check size={15} />}</button>
                <button className="btn" style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={() => handleDelete(item._id)}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="card" style={{ width: '580px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editing ? 'Edit FAQ' : 'Add FAQ'}</h2>
            <div className="form-group">
              <label>Question</label>
              <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="e.g. How long does a boiler installation take?" />
            </div>
            <div className="form-group">
              <label>Answer</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="The detailed answer..." rows={6} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-gray)', border: '1px solid var(--card-border)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.question || !form.answer}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add FAQ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
