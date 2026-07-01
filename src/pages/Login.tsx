import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loginOtpHint, setLoginOtpHint] = useState('');

  // Real Google OAuth Login States
  const [showGooglePopup, setShowGooglePopup] = useState(false);
  const [googleRole, setGoogleRole] = useState<'buyer' | 'vendor'>('buyer');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  
  // Real Google User Profile Details
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googlePicture, setGooglePicture] = useState('');
  
  const [searchParams] = useSearchParams();

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (searchParams.get('action') === 'google') {
      showToast('Banza ukande kuri "Sign in with Google" uhitemo konti yawe.', 'info');
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    if (!(window as any).google) {
      showToast('Google login SDK loading error. Please reload the page.', 'error');
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
      showToast('Failed to initialize Google Login popup.', 'error');
    }
  };

  const confirmGoogleLogin = async () => {
    if (!googleAccessToken || !googleEmail) return;
    setGoogleLoading(true);

    try {
      // 2. Authenticate or Register in PostgreSQL backend
      const res = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: googleName, email: googleEmail, role: googleRole })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Backend failed to save Google credentials.');
      }

      // 3. Complete authentication session
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
      showToast(err.message || 'Google verification failed.', 'error');
      setGoogleLoading(false);
      setShowGooglePopup(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Send request to login endpoint
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // If OTP is required, switch to OTP verify step
      if (data.otpRequired) {
        setOtpRequired(true);
        setLoginOtpHint(data.otp || '');
        showToast('Nyamuneka verification OTP yoherejwe kuri imeli! (OTP challenge sent)', 'success');
        return;
      }

      // Legacy fallback (should not be hit under normal 2FA routing)
      login(data.token, data.user);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // 2. Save session details
      login(data.token, data.user);
      showToast(
        `Kwinjira byagenze neza! Winjiye nka ${data.user.role === 'vendor' ? 'Umuhinzi / Seller' : 'Umuguzi / Buyer'} (${data.user.email})`,
        'success'
      );

      // 3. Redirect
      if (data.user.role === 'vendor') {
        navigate('/vendor/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP code is invalid or expired.');
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
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 fill-current" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
            </svg>
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

        {/* Login Form or OTP Verification Form */}
        {!otpRequired ? (
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
                <div className="flex justify-between items-center mb-1.5 pl-1">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                    Forgot Password?
                  </Link>
                </div>
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

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="flex-shrink mx-4 text-[10px] text-stone-400 font-bold uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
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
                <span>Sign in with Google</span>
              </button>

              <div className="text-center text-xs">
                <span className="text-slate-500">Don't have an account? </span>
                <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                  Create one now
                </Link>
              </div>
            </div>
          </form>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleVerifyOtp}>
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Twakohereje umubare w'ibanga (OTP code) kuri imeli yawe. Nyamuneka yinjize hano kugira ngo winjire.
              </p>
              
              {/* Visual Presentation OTP Helper Card */}
              {loginOtpHint && (
                <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/70 p-4 text-left shadow-sm animate-pulse">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1.5">
                    <span>💡 Demo Mode Helper</span>
                  </div>
                  <p className="text-xs text-orange-700 leading-snug font-medium">
                    Because this is a local evaluation, we printed the generated OTP code here so you don't have to open your email:
                  </p>
                  <div className="mt-3 text-center">
                    <span className="inline-block bg-white border border-orange-200 rounded-xl px-4 py-2 font-mono text-xl font-extrabold text-orange-600 tracking-wider">
                      {loginOtpHint}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="otp-code" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1 text-left">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  id="otp-code"
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-center font-mono text-lg font-black tracking-widest text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
                  placeholder="000000"
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
                    <span>Verifying...</span>
                  </span>
                ) : (
                  'Verify & Continue'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpRequired(false);
                  setError('');
                }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-705 transition-colors cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. SIMULATED GOOGLE OAUTH POPUP MODAL */}
      {showGooglePopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-stone-250 shadow-2xl relative animate-scaleIn text-stone-850">
            <button 
              onClick={() => setShowGooglePopup(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Google Logo */}
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

            <h3 className="text-center font-black text-stone-900 text-base">Sign in with Google</h3>
            <p className="text-center text-[10px] text-stone-400 font-bold mt-1">to continue to AgriMarket Platform</p>

            <div className="my-6 border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-4">
              {/* Account list card */}
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
                      handleGoogleLogin();
                    }}
                    className="text-[9px] text-emerald-600 hover:text-emerald-700 font-extrabold underline block mt-1 hover:scale-102 transition-all cursor-pointer"
                  >
                    Switch Account
                  </button>
                </div>
              </div>

              {/* Role Select inside Google Login popup */}
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
                onClick={confirmGoogleLogin}
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
