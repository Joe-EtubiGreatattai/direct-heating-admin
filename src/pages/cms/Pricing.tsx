import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Check, X, Star } from 'lucide-react';

const API = 'https://direct-heating.duckdns.org/api';

interface PricingPlan {
  _id: string;
  tab: 'domestic' | 'commercial';
  name: string;
  price: string;
  priceUnit: string;
  featured: boolean;
  features: string[];
  ctaText: string;
  ctaLink: string;
  order: number;
  active: boolean;
}

const emptyForm = {
  tab: 'domestic' as 'domestic' | 'commercial',
  name: '',
  price: '',
  priceUnit: '',
  featured: false,
  features: [''],
  ctaText: 'Get Quote',
  ctaLink: '/contact',
  active: true
};

interface Props {
  fetcher: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function PricingManager({ fetcher }: Props) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'domestic' | 'commercial'>('domestic');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PricingPlan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetcher(`${API}/admin/cms/pricing`);
      setPlans(await res.json());
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, tab: activeTab });
    setShowModal(true);
  }

  function openEdit(plan: PricingPlan) {
    setEditing(plan);
    setForm({
      tab: plan.tab,
      name: plan.name,
      price: plan.price,
      priceUnit: plan.priceUnit,
      featured: plan.featured,
      features: plan.features.length > 0 ? plan.features : [''],
      ctaText: plan.ctaText,
      ctaLink: plan.ctaLink,
      active: plan.active
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, features: form.features.filter(f => f.trim() !== '') };
      if (editing) {
        const res = await fetcher(`${API}/admin/cms/pricing/${editing._id}`, { method: 'PUT', body: JSON.stringify(payload) });
        const updated = await res.json();
        setPlans(prev => prev.map(p => p._id === updated._id ? updated : p));
      } else {
        const res = await fetcher(`${API}/admin/cms/pricing`, { method: 'POST', body: JSON.stringify(payload) });
        const created = await res.json();
        setPlans(prev => [...prev, created]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pricing plan?')) return;
    await fetcher(`${API}/admin/cms/pricing/${id}`, { method: 'DELETE' });
    setPlans(prev => prev.filter(p => p._id !== id));
  }

  async function handleToggle(plan: PricingPlan) {
    const res = await fetcher(`${API}/admin/cms/pricing/${plan._id}`, { method: 'PUT', body: JSON.stringify({ active: !plan.active }) });
    const updated = await res.json();
    setPlans(prev => prev.map(p => p._id === updated._id ? updated : p));
  }

  async function handleToggleFeatured(plan: PricingPlan) {
    const res = await fetcher(`${API}/admin/cms/pricing/${plan._id}`, { method: 'PUT', body: JSON.stringify({ featured: !plan.featured }) });
    const updated = await res.json();
    setPlans(prev => prev.map(p => p._id === updated._id ? updated : p));
  }

  // Feature list helpers
  function setFeature(idx: number, value: string) {
    setForm(f => { const features = [...f.features]; features[idx] = value; return { ...f, features }; });
  }
  function addFeature() { setForm(f => ({ ...f, features: [...f.features, ''] })); }
  function removeFeature(idx: number) { setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) })); }

  const tabPlans = plans.filter(p => p.tab === activeTab).sort((a, b) => a.order - b.order);
  const domestic = plans.filter(p => p.tab === 'domestic');
  const commercial = plans.filter(p => p.tab === 'commercial');

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-meta">
          <h1>Pricing</h1>
          <p>{domestic.length} domestic · {commercial.length} commercial plans</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Plan</button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['domestic', 'commercial'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              flex: '1 1 160px',
              background: activeTab === tab ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: activeTab === tab ? '#000' : 'var(--text-gray)',
              transition: 'all 0.2s'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tab === 'domestic' ? domestic.length : commercial.length})
          </button>
        ))}
      </div>

      {/* Pricing cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {tabPlans.map(plan => (
          <div
            key={plan._id}
            className="card"
            style={{
              opacity: plan.active ? 1 : 0.5,
              border: plan.featured ? '1px solid var(--accent)' : '1px solid var(--card-border)',
              position: 'relative'
            }}
          >
            {plan.featured && (
              <div style={{ position: 'absolute', top: '-1px', right: '1.5rem', background: 'var(--accent)', color: '#000', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '0 0 6px 6px', letterSpacing: '0.5px' }}>
                FEATURED
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{plan.name}</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>
                {plan.price}
                {plan.priceUnit && <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-gray)' }}>{plan.priceUnit}</span>}
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.25rem' }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-gray)', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success)', fontSize: '0.7rem' }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginBottom: '1rem' }}>
              CTA: <strong style={{ color: 'var(--text-main)' }}>{plan.ctaText}</strong> → {plan.ctaLink}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }} onClick={() => openEdit(plan)}>
                <Edit2 size={14} /> Edit
              </button>
              <button
                className="btn"
                style={{ fontSize: '0.8rem', padding: '0.5rem', background: plan.featured ? 'rgba(233,226,68,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${plan.featured ? 'var(--accent)' : 'var(--card-border)'}`, color: plan.featured ? 'var(--accent)' : 'var(--text-gray)' }}
                onClick={() => handleToggleFeatured(plan)}
                title={plan.featured ? 'Unfeature' : 'Set as featured'}
              >
                <Star size={14} />
              </button>
              <button className="btn" style={{ fontSize: '0.8rem', padding: '0.5rem', background: plan.active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${plan.active ? 'var(--warning)' : 'var(--success)'}`, color: plan.active ? 'var(--warning)' : 'var(--success)' }} onClick={() => handleToggle(plan)}>
                {plan.active ? <X size={14} /> : <Check size={14} />}
              </button>
              <button className="btn" style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={() => handleDelete(plan._id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {tabPlans.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-gray)' }}>
            No {activeTab} plans yet. <button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={openAdd}>Add one</button>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '580px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editing ? 'Edit Plan' : 'Add Pricing Plan'}</h2>

            {/* Tab */}
            <div className="form-group">
              <label>Category</label>
              <select value={form.tab} onChange={e => setForm(f => ({ ...f, tab: e.target.value as 'domestic' | 'commercial' }))}>
                <option value="domestic">Domestic</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Plan Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Boiler Service" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '2rem' }}>
                <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} style={{ width: 'auto' }} />
                <label htmlFor="featured" style={{ marginBottom: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Star size={15} style={{ color: 'var(--accent)' }} /> Featured card
                </label>
              </div>
            </div>

            <div style={{ height: '1rem' }} />
            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Price</label>
                <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. £80 or Free quotes available" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Price Unit (optional)</label>
                <input value={form.priceUnit} onChange={e => setForm(f => ({ ...f, priceUnit: e.target.value }))} placeholder="e.g. /hour or /service" />
              </div>
            </div>

            {/* Features */}
            <div style={{ height: '1rem' }} />
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label>Features / Bullet Points</label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {form.features.map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={feat}
                    onChange={e => setFeature(idx, e.target.value)}
                    placeholder={`Feature ${idx + 1}`}
                    style={{ flex: 1 }}
                  />
                  {form.features.length > 1 && (
                    <button
                      onClick={() => removeFeature(idx)}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer', padding: '0 0.75rem' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addFeature}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--card-border)', color: 'var(--text-gray)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%', marginBottom: '1rem' }}
            >
              + Add feature
            </button>

            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>CTA Button Text</label>
                <input value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))} placeholder="e.g. Book Now" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>CTA Link</label>
                <input value={form.ctaLink} onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))} placeholder="/contact" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-gray)', border: '1px solid var(--card-border)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.price}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
