import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Google Register States
    const [showGooglePopup, setShowGooglePopup] = useState(false);
    const [googleRole, setGoogleRole] = useState<'buyer' | 'vendor'>('buyer');
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleAccessToken, setGoogleAccessToken] = useState('');
    const [googleName, setGoogleName] = useState('');
    const [googleEmail, setGoogleEmail] = useState('');
    const [googlePicture, setGooglePicture] = useState('');

    useEffect(() => {
        const roleParam = searchParams.get('role');
        if (roleParam === 'vendor' || roleParam === 'buyer') {
            setRole(roleParam);
            setGoogleRole(roleParam);
        }
    }, [searchParams]);

    const handleGoogleRegisterClick = () => {
        if (!(window as any).google) {
            showToast('Google register SDK loading error. Please reload the page.', 'error');
            return;
        }

        try {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '714098016603-vmaj4k1gv1cjq1pnrtul4mbkk2b0icst.apps.googleusercontent.com',
                scope: 'email profile openid',
                callback: async (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        console.error(tokenResponse.error);
                        showToast('Google Sign-In was cancelled or failed.', 'warning');
                        return;
                    }
                    
                    setGoogleAccessToken(tokenResponse.access_token);
                    
                    let emailForCheck = '';
                    let nameForCheck = '';
                    let pictureForCheck = '';

                    try {
                        const userinfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`);
                        if (userinfoRes.ok) {
                            const googleUser = await userinfoRes.json();
                            emailForCheck = googleUser.email || '';
                            nameForCheck = googleUser.name || '';
                            pictureForCheck = googleUser.picture || '';
                            setGoogleName(nameForCheck);
                            setGoogleEmail(emailForCheck);
                            setGooglePicture(pictureForCheck);
                        }
                    } catch (e) {
                        console.error('Failed to pre-fetch google profile info:', e);
                    }

                    // Check if user already exists to bypass role selection
                    try {
                        const checkRes = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: nameForCheck, email: emailForCheck })
                        });
                        const checkData = await checkRes.json();

                        if (checkRes.ok && !checkData.needsRole) {
                            login(checkData.token, checkData.user);
                            showToast(
                                `Kwinjira byagenze neza! Winjiye nka ${checkData.user.role === 'vendor' ? 'Umuhinzi / Seller' : 'Umuguzi / Buyer'} (${checkData.user.email})`,
                                'success'
                            );
                            if (checkData.user.role === 'vendor') {
                                navigate('/vendor/dashboard');
                            } else {
                                navigate('/');
                            }
                            return;
                        }
                    } catch (err) {
                        console.error('Error auto-logging in Google user:', err);
                    }

                    setShowGooglePopup(true); // Open the role chooser popup if new user!
                }
            });

            client.requestAccessToken({ prompt: 'select_account' });
        } catch (err) {
            console.error(err);
            showToast('Failed to initialize Google Register popup.', 'error');
        }
    };

    const confirmGoogleRegister = async () => {
        if (!googleAccessToken || !googleEmail) return;
        setGoogleLoading(true);

        try {
            // Authenticate or Register in PostgreSQL backend
            const res = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: googleName, email: googleEmail, role: googleRole })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Backend failed to save Google credentials.');
            }

            // Complete authentication session
            login(data.token, data.user);
            setGoogleLoading(false);
            setShowGooglePopup(false);
            showToast(
                `Kwinjira byagenze neza! Winjiye nka ${data.user.role === 'vendor' ? 'Umuhinzi / Seller' : 'Umuguzi / Buyer'} (${data.user.email})`,
                'success'
            );

            if (data.user.role === 'vendor') {
                navigate('/vendor/dashboard');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Google registration verification failed.', 'error');
            setGoogleLoading(false);
            setShowGooglePopup(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 1. Password Match Validation
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
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
            setError(err.message || 'Registration failed. Please use another email address.');
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
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                            <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
                        </svg>
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

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-stone-200"></div>
                            <span className="flex-shrink mx-4 text-[10px] text-stone-400 font-bold uppercase tracking-wider">or</span>
                            <div className="flex-grow border-t border-stone-200"></div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleRegisterClick}
                            className="flex w-full justify-center items-center space-x-2.5 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 hover:border-stone-300 px-4 py-3.5 text-xs font-black text-stone-700 shadow-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                <path
                                fill="#EA4335"
                                d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.93 1 12 1 7.37 1 3.4 3.65 1.48 7.52l3.75 2.91C6.12 7.36 8.84 5.04 12 5.04z"
                                />
                                <path
                                fill="#4285F4"
                                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.37-4.87 3.37-8.5z"
                                />
                                <path
                                fill="#FBBC05"
                                d="M5.23 14.47c-.24-.72-.37-1.49-.37-2.27s.13-1.55.37-2.27L1.48 7.52C.54 9.4.01 11.51.01 13.75s.53 4.35 1.47 6.23l3.75-2.91z"
                                />
                                <path
                                fill="#34A853"
                                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.3 1.09-3.7 1.09-3.16 0-5.88-2.32-6.77-5.39L1.08 16.27C3 20.14 7.03 23 12 23z"
                                />
                            </svg>
                            <span>Register with Google</span>
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

            {/* Google OAuth Role Selector Popup Modal */}
            {showGooglePopup && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-stone-250 shadow-2xl relative animate-scaleIn text-stone-850">
                        <button 
                            onClick={() => setShowGooglePopup(false)}
                            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer"
                        >
                            ✕
                        </button>

                        <div className="flex justify-center mb-4">
                            <svg className="h-8 w-8" viewBox="0 0 24 24">
                                <path
                                    fill="#EA4335"
                                    d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.93 1 12 1 7.37 1 3.4 3.65 1.48 7.52l3.75 2.91C6.12 7.36 8.84 5.04 12 5.04z"
                                />
                                <path
                                    fill="#4285F4"
                                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.37-4.87 3.37-8.5z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.23 14.47c-.24-.72-.37-1.49-.37-2.27s.13-1.55.37-2.27L1.48 7.52C.54 9.4.01 11.51.01 13.75s.53 4.35 1.47 6.23l3.75-2.91z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.3 1.09-3.7 1.09-3.16 0-5.88-2.32-6.77-5.39L1.08 16.27C3 20.14 7.03 23 12 23z"
                                />
                            </svg>
                        </div>

                        <h3 className="text-center font-black text-stone-900 text-base">Register with Google</h3>
                        <p className="text-center text-[10px] text-stone-400 font-bold mt-1">to continue to AgriMarket Platform</p>

                        <div className="my-6 border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-4 text-stone-850">
                            <div className="flex items-center space-x-3 pb-3 border-b border-stone-200">
                                {googlePicture ? (
                                    <img src={googlePicture} className="h-9 w-9 rounded-full object-cover border border-stone-200" alt="Google Profile" />
                                ) : (
                                    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                                        {googleName ? googleName.substring(0, 2).toUpperCase() : 'G'}
                                    </div>
                                )}
                                <div className="text-left">
                                    <h4 className="text-xs font-black text-stone-800 leading-none">{googleName || 'Google User'}</h4>
                                    <span className="text-[10px] text-stone-450 font-bold">{googleEmail}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setShowGooglePopup(false);
                                            handleGoogleRegisterClick();
                                        }} 
                                        className="text-[9px] text-emerald-600 hover:text-emerald-700 font-extrabold underline block mt-1 hover:scale-102 transition-all cursor-pointer"
                                    >
                                        Switch Account
                                    </button>
                                </div>
                            </div>

                            <div className="text-left">
                                <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1.5 pl-1">
                                    Choose Login Role:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setGoogleRole('buyer')}
                                        className={`rounded-xl py-2 px-3 text-xs font-extrabold border transition-all cursor-pointer ${
                                            googleRole === 'buyer'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                        }`}
                                    >
                                        🛒 Buyer (Umuguzi)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGoogleRole('vendor')}
                                        className={`rounded-xl py-2 px-3 text-xs font-extrabold border transition-all cursor-pointer ${
                                            googleRole === 'vendor'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                        }`}
                                    >
                                        🧑‍🌾 Farmer (Umuhinzi)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowGooglePopup(false)}
                                className="flex-1 rounded-xl border border-stone-200 hover:bg-stone-50 py-2.5 text-xs font-bold text-stone-600 cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={googleLoading}
                                onClick={confirmGoogleRegister}
                                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-950 disabled:opacity-50 py-2.5 text-xs font-bold text-white cursor-pointer transition-all shadow flex items-center justify-center space-x-1.5"
                            >
                                {googleLoading ? (
                                    <>
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                        <span>Connecting...</span>
                                    </>
                                ) : (
                                    <span>Continue</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
