import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/cartContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string | number;
  stock: number;
  category: string;
  image_url: string;
  vendor_id: number;
  vendor_name?: string;
}

export default function Deals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { addToCart } = useCart();
  const { showToast } = useToast();

  // 1. LIVE COUNTDOWN TIMER STATE (Ticks every second)
  const [timeLeft, setTimeLeft] = useState({
    hours: 4,
    minutes: 32,
    seconds: 15
  });

  useEffect(() => {
    // Calculate time left until the end of the current day
    const timer = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const diff = endOfDay.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 2. FETCH AND ENRICH CROP DEALS
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (!res.ok) throw new Error('Failed to fetch agricultural catalog.');
        const data = await res.json();

        // Let's filter high-quality crops for our exclusive flash deals section.
        // We'll mark them as discounted products sold by Farmer Kamana (vendor_id = 1).
        const dealItems = data
          .filter((p: any) => p.id === 1 || p.id === 2 || p.id === 4 || p.id === 12 || p.category === 'Vegetables' || p.category === 'Fruits')
          .map((p: any) => {
            // Apply distinct discount percentages
            const discountPercent = p.id === 1 ? 25 : p.id === 2 ? 20 : p.id === 4 ? 15 : 10;
            const originalPrice = Math.round(Number(p.price) / (1 - discountPercent / 100));
            
            return {
              ...p,
              discountPercent,
              originalPrice,
              vendor_name: p.vendor_id === 1 ? 'Farmer Kamana' : 'Local Cooperative'
            };
          });

        setProducts(dealItems);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Could not load active deals.');
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  // Formatting utility for double-digit countdown numbers
  const formatNum = (num: number) => num.toString().padStart(2, '0');

  const handleAddToCartClick = (p: Product) => {
    addToCart({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      image_url: p.image_url,
      vendor_id: p.vendor_id,
      stock: p.stock
    }, 1);
    showToast(`${p.name} added to cart!`, 'success');
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-transparent">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-transparent min-h-screen pb-20 font-sans">
      
      {/* 1. HERO BANNER WITH TIMER */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white py-12 px-4 shadow-sm relative overflow-hidden">
        {/* Abstract pattern grid */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        <div className="mx-auto max-w-7xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <span className="inline-block bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
              ⚡ Flash Sale
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-white">
              Daily Crop Deals
            </h1>
            <p className="text-sm text-emerald-100 font-semibold leading-relaxed">
              Premium agricultural harvests direct from local cooperatives. Enjoy limited-time discounts sponsored directly by the farmers.
            </p>
          </div>

          {/* TIMER COMPONENT */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border border-emerald-500/20 flex flex-col items-center min-w-[280px] shadow-lg animate-pulse">
            <p className="text-[10px] uppercase font-black tracking-widest text-emerald-400 mb-3">
              Offers Expire In:
            </p>
            <div className="flex items-center space-x-3 text-center">
              <div>
                <span className="text-3xl font-black tabular-nums bg-slate-950/70 text-amber-400 px-3 py-2 rounded-xl block border border-slate-800">
                  {formatNum(timeLeft.hours)}
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">hours</span>
              </div>
              <span className="text-2xl font-black text-emerald-500 mb-4 animate-ping">:</span>
              <div>
                <span className="text-3xl font-black tabular-nums bg-slate-950/70 text-amber-400 px-3 py-2 rounded-xl block border border-slate-800">
                  {formatNum(timeLeft.minutes)}
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">min</span>
              </div>
              <span className="text-2xl font-black text-emerald-500 mb-4 animate-ping">:</span>
              <div>
                <span className="text-3xl font-black tabular-nums bg-slate-950/70 text-amber-400 px-3 py-2 rounded-xl block border border-slate-800">
                  {formatNum(timeLeft.seconds)}
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRODUCTS GRID SECTION */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        {error ? (
          <div className="rounded-3xl bg-rose-50 p-6 border border-rose-100 text-center text-rose-800">
            <span className="text-2xl block mb-1">⚠️</span>
            <p className="text-xs font-semibold">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-4xl block mb-2">🍃</span>
            <h3 className="text-sm font-bold text-slate-700">No active deals right now</h3>
            <p className="text-xs text-slate-450 mt-1">Please check back in a few hours for the next harvest drop.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p: any) => (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between rounded-3xl bg-white border border-[#DFDACA] hover:shadow-xl hover:shadow-stone-200/50 hover:border-emerald-300 transition-all duration-300 overflow-hidden"
              >
                <div>
                  {/* Banner Image wrapper */}
                  <div className="relative h-44 sm:h-52 w-full bg-stone-100 overflow-hidden">
                    {/* Discount Tag */}
                    <div className="absolute top-3.5 left-3.5 z-10 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md">
                      {p.discountPercent}% OFF
                    </div>

                    <Link to={`/product/${p.id}`}>
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-5xl">
                          🥔
                        </div>
                      )}
                    </Link>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    {/* Seller Badge */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-emerald-600 text-xs">🧑‍🌾</span>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                        {p.vendor_name}
                      </span>
                    </div>

                    <Link to={`/product/${p.id}`} className="block">
                      <h3 className="text-sm font-extrabold text-stone-850 group-hover:text-emerald-700 transition-colors line-clamp-1 leading-snug">
                        {p.name}
                      </h3>
                    </Link>
                    <p className="text-[11px] text-stone-500 font-medium line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Price panel */}
                    <div className="flex items-baseline space-x-2 pt-1">
                      <span className="text-sm font-black text-emerald-600">
                        {Number(p.price).toLocaleString()} RWF
                      </span>
                      <span className="text-xs font-bold text-stone-400 line-through">
                        {Number(p.originalPrice).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer buy buttons */}
                <div className="px-4 pb-4 pt-2 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between gap-2.5">
                  {/* Expiration Indicator inside card */}
                  <div className="flex items-center space-x-1 text-[10px] text-amber-600 font-extrabold">
                    <span>⏱️</span>
                    <span>Ends today</span>
                  </div>

                  <button
                    onClick={() => handleAddToCartClick(p)}
                    className="flex-1 flex justify-center items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-black shadow transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Buy Deal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
