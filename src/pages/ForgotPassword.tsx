import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState<1 | 2>(1); // 1: Send OTP, 2: Verify & Reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState(''); // Stores the OTP returned by server for easy demoing

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      showToast('OTP yoherejwe kuri email yanyu!', 'success');
      if (data.otp) {
        setDemoOtp(data.otp); // Save the generated OTP for direct demo access
      }
      setStep(2); // Advance to the OTP code verification step
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Mubanze murebe niba email mwayanditse neza.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError('Amagambo y\'ibanga ntarahura (Passwords do not match)');
    }

    if (otp.length !== 6) {
      return setError('OTP code igomba kuba ifite imibare 6 (OTP must be 6 digits)');
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      showToast('Ijambo ry\'ibanga ryahinduwe neza! Mwongere mwinjire.', 'success');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP ntiyemewe cg igihe cyayo cyarangiye.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-62px)] md:min-h-[calc(100vh-80px)] items-center justify-center bg-gradient-to-tr from-emerald-50 via-slate-50 to-teal-50 px-4 py-8 overflow-hidden text-stone-850">
      
      {/* Background Blobs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md space-y-6 rounded-3xl bg-white/80 backdrop-blur-md p-6 sm:p-10 shadow-xl border border-white/50">
        <div className="text-center">
          {/* Logo Badge */}
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 fill-current" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-stone-900">
            {step === 1 ? 'Forgot Password?' : 'Enter OTP Code'}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-600">
            {step === 1 
              ? 'Request a 6-digit OTP code to reset your password' 
              : `Verification code was sent to ${email}`
            }
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100">
            <div className="text-xs sm:text-sm font-semibold text-red-800 text-center">{error}</div>
          </div>
        )}

        {/* Demo Mode helper */}
        {demoOtp && step === 2 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-800">
            <p className="font-extrabold flex items-center mb-1">
              <span>🔐 Demo Code Generator helper:</span>
            </p>
            <p>Your OTP Code is: <strong className="text-sm font-black bg-white px-2 py-0.5 rounded border border-amber-200 select-all">{demoOtp}</strong></p>
          </div>
        )}

        {step === 1 ? (
          /* Step 1 Form */
          <form className="space-y-5" onSubmit={handleSendOtp}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-2xl border border-stone-200 bg-white/50 px-4 py-2.5 text-stone-950 placeholder-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                placeholder="name@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Sending OTP...</span>
                </span>
              ) : (
                'Send OTP Code'
              )}
            </button>
          </form>
        ) : (
          /* Step 2 Form */
          <form className="space-y-5" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="otp" className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                6-Digit OTP Code
              </label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="block w-full text-center tracking-[0.5em] font-black rounded-2xl border border-stone-200 bg-white/50 px-4 py-2.5 text-stone-950 placeholder-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                placeholder="000000"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-2xl border border-stone-200 bg-white/50 px-4 py-2.5 text-stone-950 placeholder-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-2xl border border-stone-200 bg-white/50 px-4 py-2.5 text-stone-950 placeholder-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Verifying & Resetting...</span>
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs mt-4">
          <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
