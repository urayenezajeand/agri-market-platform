import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'buyer' | 'vendor'>('buyer'); // Defaults to buyer
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const roleParam = searchParams.get('role');
        if (roleParam === 'vendor' || roleParam === 'buyer') {
            setRole(roleParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 1. Password Match Validation
        if (password !== confirmPassword) {
            return setError('Ijambo ry\'ibanga ntirihuye (Passwords do not match)');
        }

        setLoading(true);

        try {
            // 2. Send registration request to Backend API
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // 3. Save session in AuthContext
            login(data.token, data.user);

            // 4. Redirect based on role
            if (data.user.role === 'vendor') {
                navigate('/vendor/dashboard');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Kwiyandikisha byanze. Koresha indi email.');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="relative flex min-h-[calc(100vh-62px)] md:min-h-[calc(100vh-80px)] items-center justify-center bg-gradient-to-tr from-emerald-50 via-slate-50 to-teal-50 px-4 py-8 overflow-hidden">
            
            {/* 1. BACKGROUND APP BLOBS */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

            {/* 2. MAIN APP GLASS CARD */}
            <div className="relative w-full max-w-md space-y-6 rounded-3xl bg-white/80 backdrop-blur-md p-6 sm:p-10 shadow-xl border border-white/50 my-6">
                <div className="text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl shadow-md shadow-emerald-200 mb-2">
                        🌱
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                        Create Account
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600">
                        Join the agricultural marketplace today
                    </p>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                        <div className="text-xs sm:text-sm font-semibold text-red-800 text-center">{error}</div>
                    </div>
                )}

                {/* Registration Form */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        
                        {/* Account Type Selector (Touch-Friendly Cards) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                                I want to join as:
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('buyer')}
                                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                                        role === 'buyer'
                                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm scale-[1.02]'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white/50'
                                    }`}
                                >
                                    <span className="text-2xl mb-1">🛍️</span>
                                    <span className="text-xs font-bold">Buyer / Client</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('vendor')}
                                    className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                                        role === 'vendor'
                                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm scale-[1.02]'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white/50'
                                    }`}
                                >
                                    <span className="text-2xl mb-1">👩‍🌾</span>
                                    <span className="text-xs font-bold">Farmer / Seller</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="full-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                                Full Name
                            </label>
                            <input
                                id="full-name"
                                name="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                                placeholder="John Doe"
                            />
                        </div>

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
                                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
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
                                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                                Confirm Password
                            </label>
                            <input
                                id="confirm-password"
                                name="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
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
                                    <span>Registering...</span>
                                </span>
                            ) : (
                                'Register'
                            )}
                        </button>

                        <div className="text-center text-xs">
                            <span className="text-slate-500">Already have an account? </span>
                            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                                Sign In
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
