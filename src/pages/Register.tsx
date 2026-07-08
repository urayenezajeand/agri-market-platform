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

    // TIN and RDB Certificate File States
    const [tinNumber, setTinNumber] = useState('');
    const [rdbCertificateBase64, setRdbCertificateBase64] = useState('');
    const [rdbFileName, setRdbFileName] = useState('');

    // Onboarding step, phone, and address states
    const [step, setStep] = useState<number>(0); // 0 = chooser, 1 = credentials, 2 = profile / verification info
    const [phone, setPhone] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRdbFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setRdbCertificateBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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
            setStep(1); // Bypass chooser if role query parameter exists!
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
                    if (tokenResponse && tokenResponse.access_token) {
                        setGoogleAccessToken(tokenResponse.access_token);
                        
                        // Fetch profile details from Google API
                        try {
                            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                            });
                            const profileData = await profileRes.json();
                            
                            setGoogleName(profileData.name || '');
                            setGoogleEmail(profileData.email || '');
                            setGooglePicture(profileData.picture || '');
                            setShowGooglePopup(true);
                        } catch (err) {
                            console.error('Failed to retrieve user profile information from Google API:', err);
                            showToast('Failed to fetch profile details from Google.', 'error');
                        }
                    }
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

            // Populate form states for step 2
            setName(data.user.name || '');
            setEmail(data.user.email || '');
            setRole(data.user.role);

            // Proceed to Step 2
            setStep(2);
            showToast(
                `Connected! ${data.user.role === 'vendor' ? 'Please complete seller verification' : 'Please configure delivery profile'}.`,
                'success'
            );
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

        if (role === 'buyer') {
            if (step === 1) {
                if (password !== confirmPassword) {
                    return setError('Passwords do not match');
                }
                
                setLoading(true);
                try {
                    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, password, role })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Registration failed');

                    login(data.token, data.user);
                    setStep(2);
                    showToast('Account created! Now set up your delivery shipping details.', 'success');
                } catch (err: any) {
                    console.error(err);
                    setError(err.message || 'Registration failed. Please check details or try another email.');
                } finally {
                    setLoading(false);
                }
            } else if (step === 2) {
                setLoading(true);
                try {
                    let currentToken = '';
                    try {
                        currentToken = localStorage.getItem('agri_token') || '';
                    } catch (e) {}

                    const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentToken}`
                        },
                        body: JSON.stringify({ name, email, phone, shipping_address: shippingAddress })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to update profile details.');

                    login(currentToken, data.user);
                    showToast('Delivery profile successfully configured!', 'success');
                    navigate('/');
                } catch (err: any) {
                    console.error(err);
                    setError(err.message || 'Failed to complete profile configuration.');
                } finally {
                    setLoading(false);
                }
            }
        } else if (role === 'vendor') {
            if (step === 1) {
                if (password !== confirmPassword) {
                    return setError('Passwords do not match');
                }
                setStep(2);
            } else if (step === 2) {
                if (!tinNumber) {
                    return setError('TIN Number is required for verification.');
                }
                if (!rdbCertificateBase64) {
                    return setError('Please upload your RDB certificate document.');
                }

                setLoading(true);
                try {
                    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name,
                            email,
                            password,
                            role,
                            tin_number: tinNumber,
                            rdb_certificate: rdbCertificateBase64
                        })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Farmer registration failed.');

                    login(data.token, data.user);
                    showToast('Seller application submitted for admin verification!', 'success');
                    navigate('/vendor/dashboard');
                } catch (err: any) {
                    console.error(err);
                    setError(err.message || 'Seller registration failed.');
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleSkipProfileSetup = () => {
        showToast('Onboarding finished. You can fill shipping details later.', 'info');
        navigate('/');
    };

    return (
        <div className="relative flex min-h-[calc(100vh-62px)] md:min-h-[calc(100vh-80px)] items-center justify-center bg-gradient-to-tr from-emerald-50 via-slate-50 to-teal-50 px-4 py-8 overflow-hidden">
            
            {/* BACKGROUND ANIMATED APP BLOBS */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

            {/* MAIN APP GLASS CARD */}
            <div className="relative w-full max-w-md space-y-6 rounded-3xl bg-white/80 backdrop-blur-md p-6 sm:p-10 shadow-xl border border-white/50 my-6">
                
                {/* 1. CHOICE SCREEN (STEP 0) */}
                {step === 0 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                                    <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">
                                Join AgriMarket
                            </h2>
                            <p className="mt-1.5 text-xs sm:text-sm text-slate-650 font-semibold">
                                Choose how you want to join our platform:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setRole('buyer');
                                    setGoogleRole('buyer');
                                    setStep(1);
                                }}
                                className="group flex items-center space-x-4 rounded-3xl border border-slate-200 bg-white/50 hover:bg-white hover:border-emerald-500 p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer animate-fadeIn"
                            >
                                <span className="text-4xl p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors">🛍️</span>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Buy Fresh Crops</h3>
                                    <p className="text-[11px] text-slate-500 font-semibold mt-1">Browse, buy directly from local farmers, secure MoMo checkouts, and fast doorstep delivery.</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setRole('vendor');
                                    setGoogleRole('vendor');
                                    setStep(1);
                                }}
                                className="group flex items-center space-x-4 rounded-3xl border border-slate-200 bg-white/50 hover:bg-white hover:border-emerald-500 p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer animate-fadeIn"
                            >
                                <span className="text-4xl p-3 bg-orange-50 rounded-2xl group-hover:bg-orange-100 transition-colors">👩‍🌾</span>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Sell Crops / Farm</h3>
                                    <p className="text-[11px] text-slate-500 font-semibold mt-1">List your crops catalogue, manage stocks, process orders, download PDFs, and get paid directly.</p>
                                </div>
                            </button>
                        </div>

                        <div className="text-center pt-2 text-xs font-semibold text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-600 hover:underline">
                                Sign In
                            </Link>
                        </div>
                    </div>
                )}

                {/* 2. CREDENTIALS INPUT STEP (STEP 1) */}
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center">
                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                                    <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
                                </svg>
                            </div>
                            <div className="flex items-center justify-center space-x-1.5 mb-1">
                                <button type="button" onClick={() => setStep(0)} className="text-[10px] font-black uppercase text-emerald-600 hover:underline cursor-pointer border-none bg-transparent">
                                    ← Back
                                </button>
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 tracking-wider">
                                    {role === 'vendor' ? 'Farmer onboarding' : 'Buyer registration'} &bull; Step 1 of 2
                                </span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                Create Account
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 font-semibold">
                                Configure your basic credentials to access the platform
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                                <div className="text-xs sm:text-sm font-semibold text-red-800 text-center">{error}</div>
                            </div>
                        )}

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-4">
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

                            <div className="space-y-4 pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full justify-center items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer border-none"
                                >
                                    {loading ? (
                                        <span className="flex items-center space-x-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                            <span>Processing...</span>
                                        </span>
                                    ) : (
                                        <span>Continue to Step 2 &rarr;</span>
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

                                <div className="text-center text-xs pt-1">
                                    <span className="text-slate-500">Already have an account? </span>
                                    <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                                        Sign In
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* 3. PROFILE / VERIFICATION DATA SETUP (STEP 2) */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        {role === 'buyer' ? (
                            // Buyer Profile Setup
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                                            <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
                                        </svg>
                                    </div>
                                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 tracking-wider block w-max mx-auto mb-1">
                                        Buyer Onboarding &bull; Step 2 of 2
                                    </span>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                        Delivery Details
                                    </h2>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                        Optionally complete your profile for seamless checkouts
                                    </p>
                                </div>

                                {error && (
                                    <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                                        <div className="text-xs sm:text-sm font-semibold text-red-800 text-center">{error}</div>
                                    </div>
                                )}

                                <form className="space-y-5" onSubmit={handleSubmit}>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="buyer-phone" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                                                Telephone Number (MoMo Contact)
                                            </label>
                                            <input
                                                id="buyer-phone"
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                                                placeholder="e.g., 078XXXXXXX"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="buyer-address" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                                                Default Shipping Address
                                            </label>
                                            <textarea
                                                id="buyer-address"
                                                rows={3}
                                                value={shippingAddress}
                                                onChange={(e) => setShippingAddress(e.target.value)}
                                                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm resize-none"
                                                placeholder="e.g., Kigali, Nyarugenge, Kiyovu, KN 50 St"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={handleSkipProfileSetup}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl py-3.5 text-xs font-bold cursor-pointer border-none transition-all duration-200"
                                        >
                                            Skip Setup
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.01] text-white rounded-2xl py-3.5 text-xs font-bold shadow-md cursor-pointer border-none transition-all active:scale-[0.99] disabled:opacity-50"
                                        >
                                            {loading ? 'Saving...' : 'Save & Finish'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            // Seller Verification Upload
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                                            <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
                                        </svg>
                                    </div>
                                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                                        <button type="button" onClick={() => setStep(1)} className="text-[10px] font-black uppercase text-emerald-600 hover:underline cursor-pointer border-none bg-transparent">
                                            ← Back
                                        </button>
                                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 tracking-wider">
                                            Farmer registration &bull; Step 2 of 2
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                        Business Verification
                                    </h2>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                        Provide required RDB & TIN credentials
                                    </p>
                                </div>

                                {error && (
                                    <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                                        <div className="text-xs sm:text-sm font-semibold text-red-800 text-center">{error}</div>
                                    </div>
                                )}

                                <form className="space-y-5" onSubmit={handleSubmit}>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="tin-number" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                                                TIN Number (Imisoro ID)
                                            </label>
                                            <input
                                                id="tin-number"
                                                name="tinNumber"
                                                type="text"
                                                required
                                                value={tinNumber}
                                                onChange={(e) => setTinNumber(e.target.value)}
                                                className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                                                placeholder="9-digit Tax Identification Number"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="rdb-cert" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                                                RDB Certificate (Choose File)
                                            </label>
                                            <div className="relative flex items-center justify-center border border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 bg-white/50 cursor-pointer">
                                                <input
                                                    id="rdb-cert"
                                                    name="rdbCert"
                                                    type="file"
                                                    required={!rdbCertificateBase64}
                                                    accept=".pdf,.png,.jpg,.jpeg"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="text-center space-y-1">
                                                    <span className="text-2xl block">📄</span>
                                                    <span className="text-xs font-bold text-slate-650 block">
                                                        {rdbFileName || 'Click to select RDB Document'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-455 block">
                                                        Supports PDF, PNG, or JPG (Max 5MB)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex space-x-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl py-3.5 text-xs font-bold cursor-pointer border-none transition-all duration-200"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.01] text-white rounded-2xl py-3.5 text-xs font-bold shadow-md cursor-pointer border-none transition-all active:scale-[0.99] disabled:opacity-50"
                                        >
                                            {loading ? 'Submitting...' : 'Submit Application'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Google OAuth Role Selector Popup Modal */}
            {showGooglePopup && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-stone-250 shadow-2xl relative animate-scaleIn text-stone-850">
                        <button 
                            type="button"
                            onClick={() => setShowGooglePopup(false)}
                            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer border-none bg-transparent"
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
                                    <span className="text-[10px] text-stone-455 font-bold">{googleEmail}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setShowGooglePopup(false);
                                            handleGoogleRegisterClick();
                                        }} 
                                        className="text-[9px] text-emerald-600 hover:text-emerald-700 font-extrabold underline block mt-1 hover:scale-102 transition-all cursor-pointer border-none bg-transparent"
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
                                className="flex-1 rounded-xl border border-stone-200 hover:bg-stone-50 py-2.5 text-xs font-bold text-stone-650 cursor-pointer transition-colors border-none"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={googleLoading}
                                onClick={confirmGoogleRegister}
                                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-950 disabled:opacity-50 py-2.5 text-xs font-bold text-white cursor-pointer transition-all shadow flex items-center justify-center space-x-1.5 border-none"
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
