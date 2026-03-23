import { useState, useEffect, useRef } from 'react';
import { Save, Upload } from 'lucide-react';

const API = 'https://direct-heating.duckdns.org/api';
const DEFAULT_HERO_IMAGE = 'https://direct-heating.duckdns.org/gallery-images/hero.png';

interface HeroData {
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  statNumber: string;
  statLabel: string;
  reviewQuote: string;
  reviewAuthor: string;
  phone: string;
  whatsappNumber: string;
  heroImage: string;
}

interface Props {
  fetcher: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function HeroContentManager({ fetcher }: Props) {
  const [form, setForm] = useState<HeroData>({
    headline: '',
    headlineHighlight: '',
    subtitle: '',
    statNumber: '',
    statLabel: '',
    reviewQuote: '',
    reviewAuthor: '',
    phone: '',
    whatsappNumber: '',
    heroImage: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadHero(); }, []);

  async function loadHero() {
    try {
      const res = await fetcher(`${API}/admin/cms/hero`);
      const data = await res.json();
      setForm(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetcher(`${API}/admin/cms/hero`, { method: 'PUT', body: JSON.stringify(form) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    handleImageUpload(file);
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/admin/cms/hero/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const updated = await res.json();
      setForm(f => ({ ...f, heroImage: updated.heroImage }));
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!confirm('Remove the custom hero image? The default image will be used instead.')) return;
    const res = await fetcher(`${API}/admin/cms/hero`, { method: 'PUT', body: JSON.stringify({ heroImage: '' }) });
    const updated = await res.json();
    setForm(f => ({ ...f, heroImage: updated.heroImage }));
  }

  function field(label: string, key: keyof HeroData, placeholder?: string, multiline?: boolean) {
    return (
      <div className="form-group">
        <label>{label}</label>
        {multiline
          ? <textarea value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} rows={3} style={{ resize: 'vertical' }} />
          : <input value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
        }
      </div>
    );
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>Loading...</div>;

  const displayImage = imagePreview || form.heroImage || DEFAULT_HERO_IMAGE;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Hero Section</h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>Edit the homepage hero banner content and image</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Hero Image Upload */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Hero Image</h3>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Preview box */}
            <div
              style={{
                width: '320px',
                height: '220px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
                border: '2px dashed var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                flexShrink: 0,
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={displayImage}
                alt="Hero preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center top' }}
              />
              {uploadingImage && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Uploading...</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />

              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                <Upload size={16} /> {uploadingImage ? 'Uploading...' : form.heroImage ? 'Replace Image' : 'Upload Image'}
              </button>

              {form.heroImage && (
                <button
                  className="btn"
                  style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                  onClick={handleRemoveImage}
                >
                  Remove — Use Default
                </button>
              )}

              <div style={{ fontSize: '0.82rem', color: 'var(--text-gray)', lineHeight: 1.5 }}>
                {form.heroImage ? (
                  <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '0.4rem' }}>✓ Custom image active</p>
                ) : (
                  <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: '0.4rem' }}>Using default hero.png</p>
                )}
                <p>Recommended: portrait or square image</p>
                <p>Max size: 10MB · JPG, PNG, WebP</p>
                {form.heroImage && (
                  <p style={{ marginTop: '0.5rem', wordBreak: 'break-all', color: 'var(--accent)', fontSize: '0.75rem' }}>
                    {form.heroImage.split('/').pop()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Headline</h3>
          {field('Main Headline', 'headline', 'e.g. Gas Safe Heating Engineers')}
          {field('Highlighted Words', 'headlineHighlight', 'e.g. You Can Trust')}
          {field('Subtitle / Tagline', 'subtitle', 'Short description below headline...', true)}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Stats Card</h3>
          {field('Stat Number', 'statNumber', 'e.g. 500+')}
          {field('Stat Label', 'statLabel', 'e.g. Installations This Year')}
          <h3 style={{ margin: '1.5rem 0', color: 'var(--accent)' }}>Review Card</h3>
          {field('Review Quote', 'reviewQuote', 'Short quote from a customer...', true)}
          {field('Review Author', 'reviewAuthor', 'e.g. Lucy')}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Contact Details</h3>
          {field('Phone Number (display)', 'phone', 'e.g. 0204 600 8746')}
          {field('WhatsApp Number (digits only)', 'whatsappNumber', 'e.g. 442046008746')}
        </div>

        <div className="card" style={{ background: 'rgba(201,169,98,0.05)', border: '1px solid rgba(201,169,98,0.2)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Live Preview</h3>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', lineHeight: 1.3, marginBottom: '0.75rem' }}>
              {form.headline || 'Headline'} <span style={{ color: 'var(--accent)' }}>{form.headlineHighlight || 'Highlight'}</span>
            </h2>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>{form.subtitle || 'Subtitle text...'}</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{form.statNumber || '500+'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>{form.statLabel || 'Stat label'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem 1rem', flex: 1, minWidth: '160px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginBottom: '0.25rem' }}>⭐⭐⭐⭐⭐</div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>&ldquo;{form.reviewQuote || 'Review quote...'}&rdquo;</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.25rem' }}>— {form.reviewAuthor || 'Author'}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
