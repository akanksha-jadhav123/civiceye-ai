import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@civiceye.local');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      nav(user.role === 'CITIZEN' ? '/citizen' : '/admin', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold text-blue-700">Sign in</h1>
        <p className="text-sm text-slate-500">CivicEye AI</p>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </div>
        )}

        <button
          disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-center text-slate-500">
          No account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">Register as citizen</Link>
        </p>

        <div className="text-xs text-slate-400 border-t pt-3 space-y-1">
          <p>Demo admin: <code>admin@civiceye.local / Admin@123</code></p>
          <p>Demo citizen: <code>citizen@civiceye.local / Citizen@123</code></p>
        </div>
      </form>
    </div>
  );
}