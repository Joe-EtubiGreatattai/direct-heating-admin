import { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://direct-heating.duckdns.org/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top left, #1a1a1a, #0a0a0a)',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '3.5rem 3rem',
        animation: 'fadeIn 0.8s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            background: 'rgba(201, 169, 98, 0.1)',
            borderRadius: '20px',
            color: 'var(--accent)',
            marginBottom: '1.5rem',
            animation: 'pulse 3s infinite'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>Admin Access</h2>
          <p style={{ color: 'var(--text-gray)', marginTop: '0.5rem' }}>Secure portal for Direct Heating management</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            fontSize: '0.9rem',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} /> Email</div></label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="form-group">
            <label><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={14} /> Password</div></label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', height: '55px', fontSize: '1.1rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>Sign In <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
