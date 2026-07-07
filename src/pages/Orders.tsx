import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  image_url?: string;
  quantity: number;
  price: number | string;
}

interface Order {
  id: number;
  buyer_id: number;
  total_amount: number | string;
  shipping_address: string;
  phone: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  items: OrderItem[];
}

export default function Orders() {
  const { token, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Nyamuneka banza winjire (Please sign in to view your orders).', 'warning');
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/orders/buyer`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to retrieve order history.');
        }

        const data = await res.json();
        setOrders(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to retrieve order history.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, isAuthenticated, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCategoryEmoji = (name: string) => {
    if (!name) return '🍃';
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('tomato') || lowercaseName.includes('cabbage') || lowercaseName.includes('carrot') || lowercaseName.includes('spinach') || lowercaseName.includes('ishiu') || lowercaseName.includes('imboga')) return '🥦';
    if (lowercaseName.includes('maize') || lowercaseName.includes('rice') || lowercaseName.includes('bean') || lowercaseName.includes('wheat') || lowercaseName.includes('ibigori')) return '🌾';
    if (lowercaseName.includes('banana') || lowercaseName.includes('mango') || lowercaseName.includes('orange') || lowercaseName.includes('avocado') || lowercaseName.includes('ipineke')) return '🍎';
    return '🥔';
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-transparent">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-transparent min-h-screen pb-16 font-sans">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
            My Purchase History
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1.5">
            Track and manage your agricultural orders placed on AgriMarket.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl bg-rose-50 p-6 border border-rose-100 text-center text-rose-800">
            <span className="text-2xl block mb-1">⚠️</span>
            <p className="text-xs font-semibold">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <span className="text-5xl block">📦</span>
            <h3 className="text-base font-bold text-slate-700">No orders found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
              You haven't ordered any crops yet. Visit our market catalog to make your first purchase!
            </p>
            <Link 
              to="/" 
              className="inline-block rounded-2xl bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs px-6 py-3 shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={order.id} className="bg-white rounded-3xl border border-slate-105 shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow">
                  
                  {/* Top order summary header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-black text-slate-800">Order ID: #{order.id}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold">Placed on {formattedDate}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Payment</p>
                      <p className="text-base font-black text-emerald-600 leading-tight">
                        {Number(order.total_amount).toLocaleString()} RWF
                      </p>
                    </div>
                  </div>

                  {/* Delivery Location Status timeline tracking */}
                  {order.status !== 'cancelled' && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Shipping Tracking Status
                      </h4>
                      <div className="relative flex items-center justify-between mt-2.5">
                        
                        {/* Connecting Line background */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0"></div>
                        <div 
                          className={`absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 z-0 transition-all duration-500`}
                          style={{
                            width: order.status === 'delivered' ? '100%' : order.status === 'shipped' ? '50%' : '0%'
                          }}
                        ></div>

                        {/* Step 1: Order Confirmed */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-emerald-500/10">
                            ✓
                          </div>
                          <span className="text-[9px] font-black text-slate-700 mt-1">Confirmed</span>
                        </div>

                        {/* Step 2: Order Shipped */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm ${
                            order.status === 'shipped' || order.status === 'delivered' 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}>
                            🚜
                          </div>
                          <span className={`text-[9px] font-black mt-1 ${
                            order.status === 'shipped' || order.status === 'delivered' ? 'text-slate-700' : 'text-slate-400'
                          }`}>Shipped</span>
                        </div>

                        {/* Step 3: Order Delivered */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm ${
                            order.status === 'delivered' 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}>
                            🏡
                          </div>
                          <span className={`text-[9px] font-black mt-1 ${
                            order.status === 'delivered' ? 'text-slate-700' : 'text-slate-400'
                          }`}>Delivered</span>
                        </div>

                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-4 leading-normal">
                        📍 Delivery Address: <span className="text-slate-700">{order.shipping_address}</span> (Contact: {order.phone})
                      </p>
                    </div>
                  )}

                  {/* List of crops inside the order */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Purchased Crops
                    </h4>
                    <div className="divide-y divide-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-1.5 bg-slate-50/40">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5 px-3 first:pt-1 last:pb-1">
                          <div className="flex items-center space-x-3.5">
                            <span className="text-xl shrink-0 select-none">
                              {getCategoryEmoji(item.product_name)}
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 leading-tight">
                                {item.product_name || 'Deleted Crop'}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                Unit Price: {Number(item.price).toLocaleString()} RWF
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-700">x{item.quantity}</p>
                            <p className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                              {(Number(item.price) * item.quantity).toLocaleString()} RWF
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
