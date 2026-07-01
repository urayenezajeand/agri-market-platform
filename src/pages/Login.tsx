import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Kohereza amakuru kuri backend API (POST request to Login endpoint)
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // 2. Guseva session mu mutekano muri AuthContext (Save token and user)
      login(data.token, data.user);

      // 3. Kohereza user ku rupapuro rugenewe role ye (Redirect based on role)
      if (data.user.role === 'vendor') {
        navigate('/vendor/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Kwinjira byanze: Reba imeli n\'ijambo ry\'ibanga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-62px)] md:min-h-[calc(100vh-80px)] items-center justify-center bg-gradient-to-tr from-emerald-50 via-slate-50 to-teal-50 px-4 py-8 overflow-hidden">
      
      {/* 1. BACKGROUND APP BLOBS (Blurs for native app feeling) */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      {/* 2. MAIN APP GLASS CARD */}
      <div className="relative w-full max-w-md space-y-8 rounded-3xl bg-white/80 backdrop-blur-md p-8 sm:p-10 shadow-xl border border-white/50">
        <div className="text-center">
          
          {/* App Brand Icon Badge */}
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl shadow-md shadow-emerald-200 mb-4">
            🌱
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600">
            Sign in to start trading agricultural products
          </p>
        </div>

        {/* Error banner (If login fails) */}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100">
            <div className="text-xs sm:text-sm font-semibold text-red-800 text-center">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label htmlFor="email-address" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                placeholder="name@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center text-xs">
              <span className="text-slate-500">Don't have an account? </span>
              <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                Create one now
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
