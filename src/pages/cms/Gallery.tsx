import { useState, useEffect, useRef } from 'react';
import { Trash2, Edit2, Upload, Plus, Check, X, Image } from 'lucide-react';

const API = 'https://direct-heating.duckdns.org/api';

interface GalleryItem {
  _id: string;
  src: string;
  alt: string;
  caption: string;
  order: number;
  active: boolean;
}

interface Props {
  fetcher: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function GalleryManager({ fetcher }: Props) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({ alt: '', caption: '' });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    try {
      const res = await fetcher(`${API}/admin/cms/gallery`);
      const data = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this image?')) return;
    await fetcher(`${API}/admin/cms/gallery/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i._id !== id));
  }

  async function handleToggleActive(item: GalleryItem) {
    const res = await fetcher(`${API}/admin/cms/gallery/${item._id}`, {
      method: 'PUT',
      body: JSON.stringify({ active: !item.active })
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  }

  async function handleSaveEdit() {
    if (!editingItem) return;
    setSaving(true);
    try {
      const res = await fetcher(`${API}/admin/cms/gallery/${editingItem._id}`, {
        method: 'PUT',
        body: JSON.stringify({ alt: editingItem.alt, caption: editingItem.caption })
      });
      const updated = await res.json();
      setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      setEditingItem(null);
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = ev => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadForm(f => ({ ...f, alt: file.name.replace(/\.[^.]+$/, '') }));
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('alt', uploadForm.alt);
      formData.append('caption', uploadForm.caption);

      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/admin/cms/gallery/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const item = await res.json();
      setItems(prev => [...prev, item]);
      setShowUploadModal(false);
      setUploadPreview(null);
      setSelectedFile(null);
      setUploadForm({ alt: '', caption: '' });
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-gray)' }}>Loading gallery...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Gallery</h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>{items.length} images · Toggle visibility or edit captions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          <Upload size={16} /> Upload Image
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {items.map(item => (
          <div key={item._id} className="card" style={{ padding: '0', overflow: 'hidden', opacity: item.active ? 1 : 0.5 }}>
            <div style={{ position: 'relative', height: '200px', background: '#1a1a1a' }}>
              <img
                src={item.src}
                alt={item.alt}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {!item.active && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.85rem' }}>HIDDEN</span>
                </div>
              )}
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginBottom: '0.3rem' }}>{item.alt}</p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.4, marginBottom: '1rem' }}>{item.caption || <em style={{ color: 'var(--text-gray)' }}>No caption</em>}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--card-border)' }} onClick={() => setEditingItem({ ...item })}>
                  <Edit2 size={14} /> Edit
                </button>
                <button className="btn" style={{ fontSize: '0.8rem', padding: '0.5rem', background: item.active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: item.active ? 'var(--warning)' : 'var(--success)', border: `1px solid ${item.active ? 'var(--warning)' : 'var(--success)'}` }} onClick={() => handleToggleActive(item)}>
                  {item.active ? <X size={14} /> : <Check size={14} />}
                </button>
                <button className="btn" style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={() => handleDelete(item._id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Edit Image</h2>
            <img src={editingItem.src} alt="" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1.5rem' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="form-group">
              <label>Alt Text</label>
              <input value={editingItem.alt} onChange={e => setEditingItem({ ...editingItem, alt: e.target.value })} placeholder="Describe the image..." />
            </div>
            <div className="form-group">
              <label>Caption</label>
              <textarea value={editingItem.caption} onChange={e => setEditingItem({ ...editingItem, caption: e.target.value })} placeholder="Caption shown on website..." rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-gray)', border: '1px solid var(--card-border)' }} onClick={() => setEditingItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Upload New Image</h2>

            <div
              style={{ border: '2px dashed var(--card-border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadPreview ? (
                <img src={uploadPreview} alt="Preview" style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '8px' }} />
              ) : (
                <>
                  <Image size={32} style={{ color: 'var(--text-gray)', marginBottom: '0.5rem' }} />
                  <p style={{ color: 'var(--text-gray)' }}>Click to select image</p>
                  <p style={{ color: 'var(--text-gray)', fontSize: '0.8rem' }}>JPG, PNG, WebP · Max 10MB</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />

            <div className="form-group">
              <label>Alt Text</label>
              <input value={uploadForm.alt} onChange={e => setUploadForm(f => ({ ...f, alt: e.target.value }))} placeholder="Describe the image..." />
            </div>
            <div className="form-group">
              <label>Caption</label>
              <textarea value={uploadForm.caption} onChange={e => setUploadForm(f => ({ ...f, caption: e.target.value }))} placeholder="Caption shown on website..." rows={2} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-gray)', border: '1px solid var(--card-border)' }} onClick={() => { setShowUploadModal(false); setUploadPreview(null); setSelectedFile(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
