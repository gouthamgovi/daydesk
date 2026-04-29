'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setMessage({
            type: 'info',
            text: 'Check your email to confirm your account, then sign in.',
          });
          setMode('signin');
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <span
            style={{
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--must) 100%)',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 2px 8px var(--accent-glow)',
            }}
          >
            DD
          </span>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>DayDesk</h1>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>
          {mode === 'signin'
            ? 'Sign in to access your tasks.'
            : 'Sign up to start tracking your tasks.'}
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              placeholder="At least 6 characters"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {message && (
            <div
              style={{
                padding: 10,
                borderRadius: 'var(--radius)',
                fontSize: 13,
                background:
                  message.type === 'error' ? 'var(--must-soft)' : 'var(--accent-soft)',
                color: message.type === 'error' ? 'var(--must)' : 'var(--accent)',
              }}
            >
              {message.text}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}
        >
          {mode === 'signin' ? (
            <>
              No account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setMessage(null);
                }}
                style={{
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 13,
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setMessage(null);
                }}
                style={{
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 13,
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
