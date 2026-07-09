import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function Settings() {
  const { user, token, isAuthenticated, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Ugomba kubanza kwinjira (Please log in to view settings)', 'warning');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [region, setRegion] = useState(user?.region || '');
  const [specialty, setSpecialty] = useState(user?.specialty || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [imageUrl, setImageUrl] = useState(user?.image_url || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRegion(user.region || '');
      setSpecialty(user.specialty || '');
      setBio(user.bio || '');
      setImageUrl(user.image_url || '');
    }
  }, [user]);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delivery Region Form States
  const [province, setProvince] = useState('Kigali');
  const [district, setDistrict] = useState(localStorage.getItem('delivery_location') || 'Nyarugenge');

  const districtsByProvince: { [key: string]: string[] } = {
    Kigali: ['Nyarugenge', 'Gasabo', 'Kicukiro'],
    Northern: ['Musanze', 'Gicumbi', 'Burera', 'Gakenke', 'Rulindo'],
    Southern: ['Huye', 'Nyanza', 'Gisagara', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyaruguru', 'Ruhango'],
    Eastern: ['Nyagatare', 'Gatsibo', 'Bugesera', 'Kayonza', 'Kirehe', 'Ngoma', 'Rwamagana'],
    Western: ['Rubavu', 'Karongi', 'Rutsiro', 'Nyabihu', 'Nyamasheke', 'Rusizi', 'Ngororero']
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, region, specialty, bio, image_url: imageUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update the AuthContext profile details
      if (token) {
        login(token, data.user);
      }
      showToast('Umwirondoro wavuguruwe neza! (Profile updated successfully)', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Birabaye: ntibishoboye kuvugururwa.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('Amagambo yi\'banga ntarahura (Passwords do not match)', 'error');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      showToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('delivery_location', district);
    // Dispatch event to update other pages dynamically
    window.dispatchEvent(new Event('location-changed'));
    showToast(`Ahantu ho kugeza ibicuruzwa hageze ku kigero cya ${district}!`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-3 pb-6 border-b border-stone-200">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Igenamiterere rya Konti</h1>
            <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">User Account & General Settings</p>
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: Profile & Settings */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Edit Profile glass card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200">
              <h3 className="text-lg font-black text-stone-900 mb-6 flex items-center space-x-2">
                <span className="text-emerald-600">👤</span>
                <span>Umwirondoro (Personal Profile)</span>
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                  />
                </div>

                {user?.role === 'vendor' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                        Region / District
                      </label>
                      <input
                        type="text"
                        required
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                        placeholder="e.g. Musanze District"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                        Specialty
                      </label>
                      <input
                        type="text"
                        required
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                        placeholder="e.g. Kinigi Potatoes & Organic Tomatoes"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                        Profile Image URL
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                        Farmer Bio / Description
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                        placeholder="Tell buyers about your farming experience and practices..."
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-2.5 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow flex items-center space-x-1.5"
                  >
                    {profileLoading ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password glass card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200">
              <h3 className="text-lg font-black text-stone-900 mb-6 flex items-center space-x-2">
                <span className="text-emerald-600">🔐</span>
                <span>Mutekano (Security & Password)</span>
              </h3>

              {user?.email.includes('gmail.com') && (
                <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-800">
                  <p className="font-extrabold mb-1">💡 Google Account Detected</p>
                  <p>Because you log in using your Google account, you do not need a password. However, you can set a password below to sign in traditionally using your email and password as well!</p>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                {/* Only require current password if not a Google account */}
                {!user?.email.includes('gmail.com') && (
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 pl-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-stone-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-2.5 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow flex items-center space-x-1.5"
                  >
                    {passwordLoading ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Column 2: Location Settings */}
          <div className="space-y-8">
            
            {/* Delivery Location Setting */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-stone-200">
              <h3 className="text-base font-black text-stone-900 mb-4 flex items-center space-x-2">
                <span className="text-emerald-600">📍</span>
                <span>Ahantu ho Kugeza (Delivery Region)</span>
              </h3>
              
              <p className="text-xs text-stone-500 leading-relaxed mb-6">
                Set your default delivery province and district. This will automatically populate your checkout coordinates.
              </p>

              <form onSubmit={handleSaveLocation} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 pl-1">
                    Province
                  </label>
                  <select
                    value={province}
                    onChange={(e) => {
                      const newProv = e.target.value;
                      setProvince(newProv);
                      setDistrict(districtsByProvince[newProv][0]);
                    }}
                    className="block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-850 focus:outline-none focus:border-emerald-500 text-xs font-semibold shadow-sm"
                  >
                    <option value="Kigali">Kigali City</option>
                    <option value="Northern">Northern Province</option>
                    <option value="Southern">Southern Province</option>
                    <option value="Eastern">Eastern Province</option>
                    <option value="Western">Western Province</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 pl-1">
                    District
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-850 focus:outline-none focus:border-emerald-500 text-xs font-semibold shadow-sm"
                  >
                    {districtsByProvince[province].map((dist) => (
                      <option key={dist} value={dist}>{dist} District</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer mt-2"
                >
                  Save Region
                </button>
              </form>
            </div>
            
          </div>
          
        </div>

      </div>
    </div>
  );
}
