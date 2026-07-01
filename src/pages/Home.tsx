import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/cartContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

// Define the Crop/Product TS Interface
interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  stock: number;
  category: string;
  image_url?: string;
  vendor_id: number;
  vendor_name?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const activeFilter = searchParams.get('filter') || '';
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { addToCart } = useCart();
  const { showToast } = useToast();

  // Functional Slider / Carousel States
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: (
        <>
          "For a greener <br />
          and healthier world, <br />
          <span className="text-emerald-700">go organic."</span>
        </>
      ),
      badge: "Buy our products online!",
      badgeBg: "bg-emerald-600 shadow-emerald-600/10",
      bgClass: "from-emerald-50 via-emerald-100/30 to-slate-50 border-emerald-200/60",
      image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
      fallbackIcon: "🚜"
    },
    {
      title: (
        <>
          "Fresh from Northern Hills <br />
          directly to your kitchen <br />
          <span className="text-amber-700">in Kigali."</span>
        </>
      ),
      badge: "Support local farmers today",
      badgeBg: "bg-amber-600 shadow-amber-600/10",
      bgClass: "from-amber-50 via-amber-100/30 to-slate-50 border-amber-200/60",
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80",
      fallbackIcon: "🌾"
    },
    {
      title: (
        <>
          "Instant MoMo Payments <br />
          and reliable same-day <br />
          <span className="text-teal-700">doorstep delivery."</span>
        </>
      ),
      badge: "Fast & Secure Checkout",
      badgeBg: "bg-teal-600 shadow-teal-600/10",
      bgClass: "from-teal-50 via-teal-100/30 to-slate-50 border-teal-200/60",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=80",
      fallbackIcon: "📱"
    }
  ];

  // Auto-play the slider carousel every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Wishlist dynamic helper states
  const [, setWishlistTrigger] = useState(false);

  const toggleWishlist = (product: Product) => {
    let current = [];
    try {
      const stored = localStorage.getItem('wishlist_items');
      if (stored) current = JSON.parse(stored);
    } catch(e) {}
    
    const exists = current.some((item: any) => item.id === product.id);
    let updated;
    if (exists) {
      updated = current.filter((item: any) => item.id !== product.id);
      showToast(`${product.name} removed from wishlist.`, 'info');
    } else {
      updated = [...current, product];
      showToast(`${product.name} saved to wishlist!`, 'success');
    }
    localStorage.setItem('wishlist_items', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
    setWishlistTrigger(prev => !prev);
  };

  const isInWishlist = (id: number) => {
    try {
      const stored = localStorage.getItem('wishlist_items');
      if (stored) {
        const list = JSON.parse(stored);
        return list.some((item: any) => item.id === id);
      }
    } catch(e) {}
    return false;
  };

  // Sync wishlist updates from Navbar changes
  useEffect(() => {
    const handleSync = () => setWishlistTrigger(prev => !prev);
    window.addEventListener('wishlist-updated', handleSync);
    return () => window.removeEventListener('wishlist-updated', handleSync);
  }, []);

  // Fetch all crops from Backend API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (!res.ok) throw new Error('Crops could not be loaded.');
        const data = await res.json();
        setProducts(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Guhuza na server byanze. Reba ko backend iri kwaka.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = ['All', 'Grains', 'Vegetables', 'Fruits', 'Tubers', 'Other'];

  // Helper to generate mock ratings (declared before use in filteredProducts)
  const getMockRating = (id: number) => {
    const ratings = ['4.8', '4.7', '4.9', '4.6'];
    const reviews = ['42', '18', '94', '27']; // Human-scale review counts
    const index = id % 4;
    return {
      stars: ratings[index],
      count: reviews[index]
    };
  };

  // Filter crops based on search query, selected category, and subheader active query parameter filter
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    let matchesFilter = true;
    const rating = getMockRating(p.id);
    const priceNum = Number(p.price);

    if (activeFilter === 'featured') {
      matchesFilter = Number(rating.stars) >= 4.8;
    } else if (activeFilter === 'deals') {
      matchesFilter = priceNum <= 500; // Under 500 RWF Deals of the Day
    } else if (activeFilter === 'discounts') {
      matchesFilter = priceNum > 500 && priceNum <= 1000; // Best Discount Offers (500 - 1000 RWF)
    } else if (activeFilter === 'savings') {
      matchesFilter = p.stock >= 200; // Big Saving Deals (Stock quantity 200+)
    }

    return matchesSearch && matchesCategory && matchesFilter;
  });

  // Helper to resolve category emojis
  const getCategoryEmoji = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'grains': return '🌾';
      case 'vegetables': return '🥦';
      case 'fruits': return '🍎';
      case 'tubers': return '🥔';
      default: return '🍃';
    }
  };

  // Helper to calculate mock original price (crossed out) for discount styling
  const getOriginalPrice = (price: number) => {
    return Math.floor(price * 1.25); // Adds a 20% discount styling
  };



  // Helper to resolve category gradients for premium fallbacks
  const getCategoryGradient = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'grains': return 'from-amber-50 to-orange-100/30 text-amber-600';
      case 'vegetables': return 'from-emerald-50 to-teal-100/30 text-emerald-600';
      case 'fruits': return 'from-rose-50 to-red-100/30 text-rose-600';
      case 'tubers': return 'from-yellow-50 to-amber-100/20 text-amber-700';
      default: return 'from-slate-50 to-slate-100/40 text-slate-500';
    }
  };

  return (
    <div className="bg-transparent min-h-screen pb-16 font-sans">
      <div className="mx-auto max-w-7xl px-4 py-6">
        
        {/* ==========================================
            1. SPURTCOMMERCE HERO CAROUSEL BANNER
           ================================         {/* Dynamic Slider Carousel Container */}
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-r ${slides[currentSlide].bgClass} border text-slate-800 min-h-[300px] sm:min-h-[380px] flex items-center px-8 sm:px-12 py-10 shadow-sm transition-all duration-700`}>
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          {/* Slider control arrows */}
          <button 
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 hover:bg-white text-slate-700 shadow-sm transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer z-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={() => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 hover:bg-white text-slate-700 shadow-sm transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer z-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Grid Layout containing Text left, Advertisement Image right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full relative z-10">
            {/* Left contents */}
            <div className="lg:col-span-7 space-y-5 text-left">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight select-none text-slate-900 animate-fadeIn">
                {slides[currentSlide].title}
              </h1>
              
              <div className="flex flex-wrap gap-3">
                <div className={`inline-block ${slides[currentSlide].badgeBg} text-white rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold tracking-wide shadow-sm hover:scale-102 transition-all`}>
                  {slides[currentSlide].badge}
                </div>
                <button 
                  onClick={() => {
                    const filterType = ['featured', 'deals', 'savings'][currentSlide];
                    window.location.search = `?filter=${filterType}`;
                  }}
                  className="bg-white/85 hover:bg-white text-slate-900 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer"
                >
                  Explore Offer →
                </button>
              </div>
            </div>

            {/* Right contents: Advertisement Image with professional mockup frame */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className={`relative w-full max-w-sm sm:max-w-md h-48 sm:h-60 rounded-2xl overflow-hidden border border-white/60 shadow-lg shadow-slate-200/50 bg-gradient-to-br ${slides[currentSlide].bgClass} flex items-center justify-center group`}>
                {/* Fallback thematic emoji always in the background */}
                <span className="absolute text-7xl select-none group-hover:scale-110 transition-transform duration-500">
                  {slides[currentSlide].fallbackIcon}
                </span>

                {/* Image overlay badge */}
                <div className="absolute top-3 right-3 z-15 bg-slate-900/90 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-sm">
                  Sponsored Ad
                </div>
                
                <img 
                  src={slides[currentSlide].image} 
                  alt="Advertisement Banner" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
              </div>
            </div>
          </div>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 w-2 rounded-full transition-all duration-300 hover:scale-125 active:scale-75 cursor-pointer ${
                  currentSlide === idx ? 'bg-emerald-600 w-4' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ==========================================
            2. CATEGORIES FILTER SECTION
           ========================================== */}
        <div className="mt-8">
          <div className="flex space-x-2.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center space-x-1.5 rounded-full px-5 py-2.5 text-xs font-bold border transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{getCategoryEmoji(cat)}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ==========================================
            3. DYNAMIC CONTENT: DEALS GRID OR FARMING BLOGS
           ========================================== */}
        {activeFilter === 'blogs' ? (
          // RENDER PREMIUM AGRICULTURE BLOG & GUIDES
          <div className="mt-8 space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <span>📚</span>
                <span>AgriMarket Farming Blog & Guides</span>
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Practical insights and stories directly from Musanze, Gicumbi and other agricultural hubs in Rwanda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Blog Post 1 */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60" 
                      alt="Tomatoes" 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                    />
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                      Vegetables
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      Musanze Organic Tomato Farming Guide
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Discover how farmers in Musanze are producing sweet, high-yield organic tomatoes using eco-friendly compost and drip irrigation.
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>By Farmer Kamana</span>
                  <span>4 min read</span>
                </div>
              </div>

              {/* Blog Post 2 */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=60" 
                      alt="Potatoes" 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                    />
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                      Tubers
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      Irish Potatoes Crop Rotation Strategy
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Learn the secrets of nitrogen fixation. Rotating Irish Potatoes (Kinigi type) with climbing beans to double potato harvest sizes.
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>By Dr. Agnes R. (RAB)</span>
                  <span>6 min read</span>
                </div>
              </div>

              {/* Blog Post 3 */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=60" 
                      alt="Bananas" 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                    />
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="inline-block bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                      Fruits
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      Post-Harvest Banana Care Tips
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      Keeping sweet bananas (Imineke) fresh during transportation from Southern Province to Kigali markets without chemical sprays.
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>By Mama Keza</span>
                  <span>3 min read</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // RENDER EXISTING DEALS OF THE DAY / PRODUCTS GRID LAYOUT
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* LEFT SIDEBAR: "Deal of the day" light banner */}
            <div className="lg:col-span-1 rounded-lg bg-gradient-to-b from-emerald-50/80 to-slate-50/50 border border-emerald-200/60 text-slate-800 p-6 flex flex-col justify-between items-center text-center shadow-sm relative overflow-hidden min-h-[260px] lg:min-h-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-800/50 rounded-full blur-xl opacity-10"></div>
              
              <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-center">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black italic tracking-wide text-emerald-950">Deal</h2>
                  <p className="text-lg font-bold uppercase tracking-widest text-emerald-800">of the</p>
                  <h2 className="text-3xl font-black italic tracking-wide text-emerald-950">day</h2>
                </div>
                
                {/* Added decorative middle badge to fill vertical space beautifully */}
                <div className="border-y border-emerald-200/60 py-3 my-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-white bg-emerald-600 px-3.5 py-1 rounded-full shadow-sm">
                    Up to 25% Off
                  </span>
                  <p className="text-[10px] text-emerald-800 mt-2 font-bold">Fresh Harvest</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCategory('All')}
                className="w-full max-w-[140px] rounded-lg bg-slate-900 hover:bg-slate-950 text-white py-2.5 text-xs font-bold transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] shadow-md cursor-pointer relative z-10"
              >
                View All
              </button>
            </div>

            {/* RIGHT SIDEBAR: Grid / Product listing matching spurtcommerce design */}
            <div className="lg:col-span-4">
              {loading ? (
                // Loader Skeletons
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="animate-pulse rounded-lg bg-white border border-slate-200 p-4 space-y-3">
                      <div className="h-32 rounded bg-slate-100"></div>
                      <div className="h-4 w-2/3 rounded bg-slate-100"></div>
                      <div className="h-4 w-1/3 rounded bg-slate-100"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-lg bg-rose-50 p-6 border border-rose-100 text-center text-rose-800">
                  <span className="text-2xl block mb-1">⚠️</span>
                  <p className="text-xs font-semibold">{error}</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
                  <span className="text-4xl block mb-2">🌾</span>
                  <h3 className="text-sm font-bold text-slate-700">No crops found</h3>
                  <p className="text-xs text-slate-400">Try adjusting your category filters</p>
                </div>
              ) : (
                // Product Card List matching Spurtcommerce styles
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((p) => {
                    const originalPrice = getOriginalPrice(Number(p.price));
                    const rating = getMockRating(p.id);

                    return (
                      <Link
                        key={p.id}
                        to={`/product/${p.id}`}
                        className="group relative flex flex-col justify-between rounded-2xl bg-white border border-slate-100 hover:shadow-lg hover:shadow-slate-100/50 hover:border-emerald-200 transition-all duration-300 p-3.5"
                      >
                        <div>
                          {/* Discount Badge */}
                          <div className="absolute top-3.5 left-3.5 z-10 bg-slate-900/90 backdrop-blur-sm text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
                            20% OFF
                          </div>

                          {/* Wishlist Heart Icon (SVG) */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleWishlist(p);
                            }}
                            className={`absolute top-3.5 right-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 hover:bg-rose-50 border border-slate-100 cursor-pointer transition-all duration-200 shadow-sm ${
                              isInWishlist(p.id) ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                            }`}
                            title="Save to Wishlist"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 stroke-current stroke-2 ${isInWishlist(p.id) ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>

                          {/* Crop Image Display (Smart Double-Layer Fallback with Category-specific soft gradient background) */}
                          <div className={`relative overflow-hidden h-36 w-full rounded-xl bg-gradient-to-br ${getCategoryGradient(p.category)} border border-slate-100 mb-3.5 flex items-center justify-center`}>
                            {/* 1. Emoji is always in the background */}
                            <span className="absolute text-5xl group-hover:scale-110 transition-transform duration-300 select-none">
                              {getCategoryEmoji(p.category)}
                            </span>

                            {/* 2. Image fits on top. If it fails, hide it instantly to reveal the emoji */}
                            {p.image_url && (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}

                            {p.stock === 0 && (
                              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10">
                                <span className="text-[10px] uppercase font-black tracking-wider text-white bg-slate-955 px-2 py-0.5 rounded shadow-sm">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Crop details */}
                          <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                            {p.name}
                          </h3>

                          {/* Rating block badge */}
                          <div className="flex items-center space-x-1 mt-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-500 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <span className="text-xs font-bold text-slate-850">{rating.stars}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              ({rating.count} reviews)
                            </span>
                          </div>
                        </div>

                        {/* Pricing and Cart button */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                          {/* Crossed-out original pricing tag */}
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-base font-black text-slate-900">
                              {Number(p.price).toLocaleString()} RWF
                            </span>
                            <span className="text-xs text-slate-400 line-through font-semibold">
                              {originalPrice.toLocaleString()} RWF
                            </span>
                          </div>

                          {/* Bottom Actions Row: Quick views + Add to Cart */}
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-1.5">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  showToast(`Crop ${p.name} added to comparison list!`, 'info');
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-205 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all duration-200 cursor-pointer"
                                title="Compare"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  showToast(`Description: ${p.description || 'No description provided.'}`, 'info');
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-205 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all duration-200 cursor-pointer"
                                title="Quick View"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>

                            <button
                              disabled={p.stock === 0}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart({
                                  id: p.id,
                                  name: p.name,
                                  price: Number(p.price),
                                  image_url: p.image_url || '',
                                  vendor_id: p.vendor_id,
                                  stock: p.stock
                                }, 1);
                                showToast(`Added ${p.name} to cart!`, 'success');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm shadow-emerald-600/10 transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer flex items-center space-x-1"
                            >
                              <span>Add to Cart</span>
                            </button>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
