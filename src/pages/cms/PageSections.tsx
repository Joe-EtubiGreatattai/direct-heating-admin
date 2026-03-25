import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Save, LayoutGrid, GripVertical } from 'lucide-react';

const API = 'https://direct-heating.duckdns.org/api';

type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

interface Props {
  fetcher: Fetcher;
}

type PageKey = 'home' | 'services' | 'pricing' | 'testimonials' | 'contact' | 'household' | 'business' | 'book-now';

const PAGE_TITLES: Record<PageKey, string> = {
  home: 'Home',
  services: 'Services',
  pricing: 'Pricing',
  testimonials: 'Reviews',
  contact: 'Contact Us',
  household: 'Household',
  business: 'Business',
  'book-now': 'Book Now'
};

const PAGE_SECTIONS: Record<PageKey, { key: string; label: string; editTo?: string }[]> = {
  home: [
    { key: 'homeHero', label: 'Hero', editTo: '/cms/hero' },
    { key: 'homeSegments', label: 'Segments' },
    { key: 'homeServices', label: 'Services', editTo: '/cms/services' },
    { key: 'homeEmergencyCta', label: 'Emergency Callout CTA' },
    { key: 'homePricing', label: 'Pricing', editTo: '/cms/pricing' },
    { key: 'homeTestimonials', label: 'Testimonials', editTo: '/cms/testimonials' },
    { key: 'homeGallery', label: 'Gallery', editTo: '/cms/gallery' },
    { key: 'homeFaq', label: 'FAQs', editTo: '/cms/faqs' },
    { key: 'homeBooking', label: 'Book Now' },
    { key: 'homeContact', label: 'Contact Form' }
  ],
  services: [
    { key: 'servicesServices', label: 'Services List', editTo: '/cms/services' },
    { key: 'servicesEmergencyCta', label: 'Emergency Callout CTA' },
    { key: 'servicesContact', label: 'Contact Form' }
  ],
  pricing: [
    { key: 'pricingPricing', label: 'Pricing', editTo: '/cms/pricing' },
    { key: 'pricingEmergencyCta', label: 'Emergency Callout CTA' }
  ],
  testimonials: [
    { key: 'testimonialsTestimonials', label: 'Testimonials', editTo: '/cms/testimonials' },
    { key: 'testimonialsEmergencyCta', label: 'Emergency Callout CTA' }
  ],
  contact: [
    { key: 'contactContactForm', label: 'Contact Form' }
  ],
  household: [
    { key: 'householdIntro', label: 'Intro Section' },
    { key: 'householdServices', label: 'Services' },
    { key: 'householdContact', label: 'Contact Form' }
  ],
  business: [
    { key: 'businessIntro', label: 'Intro Section' },
    { key: 'businessServices', label: 'Services' },
    { key: 'businessContact', label: 'Contact Form' }
  ],
  'book-now': [
    { key: 'bookNowNavbar', label: 'Navbar' },
    { key: 'bookNowBooking', label: 'Booking Calendar' },
    { key: 'bookNowFooter', label: 'Footer' }
  ]
};

const ORDER_FIELD_BY_PAGE: Record<PageKey, string> = {
  home: 'homeOrder',
  services: 'servicesOrder',
  pricing: 'pricingOrder',
  testimonials: 'testimonialsOrder',
  contact: 'contactOrder',
  household: 'householdOrder',
  business: 'businessOrder',
  'book-now': 'bookNowOrder'
};

function computeOrder(raw: unknown, defaults: string[]) {
  const allowed = new Set(defaults);
  const next: string[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v !== 'string') continue;
      if (!allowed.has(v)) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      next.push(v);
    }
  }
  for (const v of defaults) {
    if (!seen.has(v)) next.push(v);
  }
  return next;
}

export default function CmsPageSections({ fetcher }: Props) {
  const params = useParams();
  const pageKey = params.pageKey as PageKey | undefined;

  const sectionsForPage = useMemo(() => (pageKey && PAGE_SECTIONS[pageKey]) ? PAGE_SECTIONS[pageKey] : null, [pageKey]);
  const title = (pageKey && PAGE_TITLES[pageKey]) ? PAGE_TITLES[pageKey] : 'Page';

  const [sectionsDoc, setSectionsDoc] = useState<Record<string, unknown>>({});
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher(`${API}/admin/sections`);
      const json = (await res.json()) as unknown;
      if (json && typeof json === 'object') {
        const obj = json as Record<string, unknown>;
        setSectionsDoc(obj);
        const next: Record<string, boolean> = {};
        for (const pageSections of Object.values(PAGE_SECTIONS)) {
          for (const s of pageSections) {
            next[s.key] = typeof obj[s.key] === 'boolean' ? (obj[s.key] as boolean) : true;
          }
        }
        setSections(next);
      } else {
        setSectionsDoc({});
        setSections({});
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pageKey || !sectionsForPage) return;
    const orderField = ORDER_FIELD_BY_PAGE[pageKey];
    const defaults = sectionsForPage.map(s => s.key);
    const raw = sectionsDoc[orderField];
    setOrder(computeOrder(raw, defaults));
  }, [pageKey, sectionsDoc, sectionsForPage]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionsForPage) return;
    setSaving(true);
    try {
      const update: Record<string, boolean> = {};
      for (const s of sectionsForPage) {
        update[s.key] = sections[s.key] ?? true;
      }
      if (pageKey) {
        (update as unknown as Record<string, unknown>)[ORDER_FIELD_BY_PAGE[pageKey]] = order;
      }
      await fetcher(`${API}/admin/sections`, { method: 'PUT', body: JSON.stringify(update) });
      alert('Page sections updated successfully');
    } finally {
      setSaving(false);
    }
  }

  if (!pageKey || !sectionsForPage) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>
        Page not found. <Link to="/cms" style={{ color: 'var(--accent)' }}>Back to CMS</Link>
      </div>
    );
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>Loading sections...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
      <div className="page-header">
        <div className="page-header-meta">
          <h1>{title}</h1>
          <p>Toggle which sections render on this page.</p>
        </div>
        <Link to="/cms" className="btn" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }}>
          <ChevronLeft size={16} /> Back
        </Link>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(233, 226, 68, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--accent)' }}>
            <LayoutGrid size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Sections</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>If a section is off, it won&apos;t render.</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Drag sections to reorder them.</div>
            {order.map((key) => {
              const s = sectionsForPage.find(x => x.key === key);
              if (!s) return null;
              return (
                <div
                  key={s.key}
                  draggable
                  onDragStart={(e) => {
                    setDraggingKey(s.key);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', s.key);
                  }}
                  onDragEnd={() => setDraggingKey(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = draggingKey || e.dataTransfer.getData('text/plain');
                    if (!from || from === s.key) return;
                    setOrder((prev) => {
                      const fromIdx = prev.indexOf(from);
                      const toIdx = prev.indexOf(s.key);
                      if (fromIdx === -1 || toIdx === -1) return prev;
                      const next = [...prev];
                      const [moved] = next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, moved);
                      return next;
                    });
                    setDraggingKey(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: draggingKey === s.key ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-gray)', cursor: 'grab' }}>
                    <GripVertical size={18} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={sections[s.key] ?? true}
                      onChange={(e) => setSections(prev => ({ ...prev, [s.key]: e.target.checked }))}
                      style={{ width: 'auto' }}
                    />
                    <span style={{ fontSize: '0.95rem' }}>{s.label}</span>
                  </label>
                  {s.editTo && (
                    <Link
                      to={s.editTo}
                      className="btn"
                      style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-main)', padding: '0.55rem 0.9rem', fontSize: '0.85rem' }}
                    >
                      Edit
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem', height: '50px' }} disabled={saving}>
            {saving ? 'Saving Changes...' : <><Save size={16} /> Save</>}
          </button>
        </form>
      </div>
    </div>
  );
}
