import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { error?: string } }; message?: string };
      const status = ax.response?.status;
      if (status === 404) {
        setError('Cannot reach API. Ensure backend is running (local: port 3001) or redeploy Render with latest code.');
      } else if (status === 401) {
        setError('Invalid email or password. Run: cd backend && npm run seed-auth — then restart backend.');
      } else if (!ax.response) {
        setError('Network error — backend may be offline. Start backend: cd backend && npm run dev');
      } else {
        setError(ax.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-brand-900 to-slate-800 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur dark:bg-gray-900/95">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart PM</h1>
          <p className="mt-1 text-sm text-gray-500">Portfolio & project command center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800">
          <p className="font-medium text-gray-700 dark:text-gray-300">Test accounts (after seed-auth)</p>
          <p className="mt-1">admin@smartpm.local / Admin@123</p>
          <p>pm@smartpm.local / Pm@12345</p>
          <p>member@smartpm.local / Member@123</p>
        </div>
      </div>
    </div>
  );
}
