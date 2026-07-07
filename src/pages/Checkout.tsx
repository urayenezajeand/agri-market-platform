import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/cartContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { token, isAuthenticated } = useAuth();
  
  // Initialize and sync delivery address from localstorage location selectors
  const getInitialAddress = () => {
    const loc = localStorage.getItem('delivery_location');
    return loc && loc !== 'Choose location' ? `${loc} District, Rwanda` : '';
  };

  const [address, setAddress] = useState(getInitialAddress());
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'cod'>('momo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  useEffect(() => {
    const handleLocationChange = () => {
      const loc = localStorage.getItem('delivery_location');
      if (loc && loc !== 'Choose location') {
        setAddress(`${loc} District, Rwanda`);
      }
    };
    window.addEventListener('location-changed', handleLocationChange);
    return () => window.removeEventListener('location-changed', handleLocationChange);
  }, []);

  const navigate = useNavigate();

  const deliveryFee = cart.length > 0 ? 1000 : 0;
  const totalPayment = cartTotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Check if authenticated
    if (!isAuthenticated || !token) {
      return setError('Ugomba kubanza kwinjira mu konti yawe (Please sign in to place an order)');
    }

    // 2. Normalize and validate phone number format
    let cleanedPhone = phone.trim().replace(/[\s-]/g, '');
    
    // Auto-prepend +250 for common Rwandan mobile format entries
    if (cleanedPhone.startsWith('07') && cleanedPhone.length === 10) {
      cleanedPhone = '+250' + cleanedPhone.substring(1);
    } else if (cleanedPhone.startsWith('7') && cleanedPhone.length === 9) {
      cleanedPhone = '+250' + cleanedPhone;
    } else if (cleanedPhone.startsWith('2507') && cleanedPhone.length === 12) {
      cleanedPhone = '+' + cleanedPhone;
    }

    if (!cleanedPhone.startsWith('+250') || cleanedPhone.length !== 13) {
      return setError('Numero ya telefone igomba gutangira na +250 cg 07 ikagira imibare 10 cg 13.');
    }

    // Save normalized phone back to state and use it
    setPhone(cleanedPhone);

    setLoading(true);

    try {
      // 3. Format items for API
      const items = cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      // 4. Send checkout request to Backend (Port 5000)
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shipping_address: address, phone: cleanedPhone, items })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Checkout process failed.');
      }

      // 5. Success: Clear cart & show receipt details
      clearCart();
      setOrderSuccess(data.order);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gukora checkout byanze. Ongera ugerageze.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <span className="text-5xl mb-4">🔑</span>
        <h2 className="text-xl font-bold text-slate-800">Authentication Required</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          Ugomba kubanza kwinjira mu konti yawe kugira ngo ukore checkout.
        </p>
        <Link
          to="/login"
          className="mt-6 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-700"
        >
          Sign In / Register
        </Link>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-62px)] items-center justify-center bg-gradient-to-tr from-emerald-50 via-slate-50 to-teal-50 px-4 py-8 overflow-hidden">
        <div className="relative w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-xl border border-slate-100 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 text-3xl shadow-sm mb-2">
            🎉
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Order Placed Successfully!
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Thank you for shopping with AgriMarket.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2.5 text-xs font-semibold text-slate-600 border border-slate-100">
            <div className="flex justify-between">
              <span>Order ID:</span>
              <span className="text-slate-900">#{orderSuccess.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Price:</span>
              <span className="text-emerald-600">{Number(orderSuccess.total_price).toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between">
              <span>Address:</span>
              <span className="text-slate-900 truncate max-w-[180px]">{orderSuccess.address}</span>
            </div>
            <div className="flex justify-between">
              <span>MoMo Phone:</span>
              <span className="text-slate-900">{orderSuccess.phone}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Status:</span>
              <span className="text-orange-600 uppercase text-[9px] font-black bg-orange-50 px-2 py-0.5 rounded-full">
                {orderSuccess.status}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="w-full flex justify-center items-center rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-62px)] bg-transparent pb-24 pt-4 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 font-bold text-xs cursor-pointer"
        >
          <span>←</span> <span>Back</span>
        </button>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Checkout</h1>

        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center">
            <span className="text-6xl block mb-4">🛒</span>
            <h2 className="text-lg font-black text-slate-800">Your basket is empty</h2>
            <p className="text-sm text-slate-500 mt-1">Add items to cart before checking out.</p>
            <Link to="/" className="mt-6 inline-block rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white">
              Back to Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Left Form (3 Columns) */}
            <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-black text-slate-800">Delivery Information</h2>

                {error && (
                  <div className="rounded-xl bg-rose-50 p-4 border border-rose-100">
                    <div className="text-xs text-rose-800 font-semibold text-center">{error}</div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="address" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                      Delivery Address
                    </label>
                    <input
                      id="address"
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Kigali, Nyarugenge, Kiyovu, House 24"
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                      Mobile Money Phone Number
                    </label>
                    <input
                      id="phone"
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +250780000000"
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 pl-1">
                      Format parameter must be exactly: +2507XXXXXXXX (13 characters)
                    </p>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">
                      Payment Option
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('momo')}
                        className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                          paymentMethod === 'momo'
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                        }`}
                      >
                        <span className="text-2xl mb-1">📱</span>
                        <span className="text-xs">Mobile Money</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                          paymentMethod === 'cod'
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                        }`}
                      >
                        <span className="text-2xl mb-1">💵</span>
                        <span className="text-xs">Pay on Delivery</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      <span>Processing Order...</span>
                    </span>
                  ) : (
                    <span>Confirm Order ({totalPayment.toLocaleString()} RWF)</span>
                  )}
                </button>
              </div>
            </form>

            {/* Right Order Review (2 Columns) */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h2 className="text-sm font-black text-slate-800">Order Summary</h2>

                {/* Mini Item List */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[220px] pr-1 pb-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{item.name}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">Qty: {item.quantity}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {(item.price * item.quantity).toLocaleString()} RWF
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-slate-900">{cartTotal.toLocaleString()} RWF</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="text-slate-900">{deliveryFee.toLocaleString()} RWF</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3 text-sm font-black text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-emerald-600">{totalPayment.toLocaleString()} RWF</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
