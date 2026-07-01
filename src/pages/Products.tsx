import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  image_url?: string;
  vendor_id: number;
  rating?: number;
}

export default function Products() {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState(2500); // Max price slider limit
  const [sortBy, setSortBy] = useState('featured'); // 'price-low', 'price-high', 'name', 'featured'

  const categories = ['All', 'Grains', 'Vegetables', 'Fruits', 'Tubers'];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (!res.ok) throw new Error('Failed to fetch catalog.');
        const data = await res.json();
        
        // Mock rating data for visual excellence
        const enriched = data.map((p: any) => ({
          ...p,
          rating: p.id === 1 ? 4.8 : p.id === 2 ? 4.6 : p.id === 3 ? 4.9 : p.id === 4 ? 4.7 : p.id === 12 ? 4.5 : 4.4
        }));
        
        setProducts(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Update initial categories and query inputs from search params on load
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    const filterParam = searchParams.get('filter');

    if (categoryParam) setSelectedCategory(categoryParam);
    if (searchParam) setSearchQuery(searchParam);
    if (filterParam) setSortBy(filterParam);
  }, [searchParams]);

  // Combined Filter and Sort Logic
  useEffect(() => {
    let result = [...products];

    // 1. Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // 2. Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // 3. Price Filter
    result = result.filter(p => Number(p.price) <= priceRange);

    // 4. Sort and Filter URL parameters
    const filterParam = searchParams.get('filter') || sortBy;
    if (filterParam === 'featured') {
      result = result.filter(p => (p.rating || 0) >= 4.6);
    } else if (filterParam === 'deals') {
      result = result.filter(p => Number(p.price) <= 500);
    } else if (filterParam === 'discounts') {
      result = result.filter(p => Number(p.price) > 500 && Number(p.price) <= 1000);
    } else if (filterParam === 'savings') {
      result = result.filter(p => p.stock >= 200);
    }

    // Sort mappings
    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredProducts(result);
  }, [products, selectedCategory, searchQuery, priceRange, sortBy, searchParams]);

  const [wishlist, setWishlist] = useState<number[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleWishlist = (id: number, name: string) => {
    let updated = [...wishlist];
    if (updated.includes(id)) {
      updated = updated.filter(w => w !== id);
      showToast(`Removed ${name} from Wishlist`, 'info');
    } else {
      updated.push(id);
      showToast(`Added ${name} to Wishlist!`, 'success');
    }
    setWishlist(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const getOriginalPrice = (price: number) => {
    return Math.floor(price * 1.25);
  };

  const getCategoryEmoji = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'grains': return '🌾';
      case 'vegetables': return '🥦';
      case 'fruits': return '🍎';
      case 'tubers': return '🥔';
      default: return '🍃';
    }
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
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Market Catalog
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-1.5">
              Browse, filter, and buy fresh agricultural crops directly from local farmers.
            </p>
          </div>

          {/* Search bar inside Catalog */}
          <div className="w-full md:max-w-sm">
            <input
              type="text"
              placeholder="Search products in catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-800 text-xs px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-semibold"
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex space-x-2.5 overflow-x-auto pb-4 scrollbar-none mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSearchParams(prev => {
                  if (cat === 'All') prev.delete('category');
                  else prev.set('category', cat);
                  return prev;
                });
              }}
              className={`flex items-center space-x-1.5 rounded-full px-5 py-2.5 text-xs font-bold border transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer whitespace-nowrap ${
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT SIDEBAR: Premium Filter Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
                Filters & Sorting
              </h3>

              {/* Price filter slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-500">Max Price</span>
                  <span className="text-emerald-600">{priceRange.toLocaleString()} RWF</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>100 RWF</span>
                  <span>5,000 RWF</span>
                </div>
              </div>

              {/* Sorting selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="featured">Best Ratings (Featured)</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Product Name (A-Z)</option>
                </select>
              </div>

              {/* Clear filters */}
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setPriceRange(2500);
                  setSortBy('featured');
                  setSearchParams({});
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl py-2 text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* RIGHT GRID: Product Listings */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <span className="text-5xl block">🌾</span>
                <h3 className="text-sm font-bold text-slate-700">No products found</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                  Try adjusting your keywords, price range slider, or category filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="group bg-white rounded-3xl border border-slate-105 overflow-hidden hover:shadow-xl hover:shadow-slate-150/40 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Image header with fallback */}
                      <div className="relative h-44 w-full bg-gradient-to-br from-slate-50 to-slate-100/30 flex items-center justify-center select-none overflow-hidden border-b border-slate-50">
                        {/* 20% discount badge */}
                        <div className="absolute top-3.5 left-3.5 z-10 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                          20% OFF
                        </div>
                        
                        {/* Wishlist toggle button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(p.id, p.name);
                          }}
                          className="absolute top-3.5 right-3.5 z-10 flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white/85 hover:bg-white text-slate-400 hover:text-rose-500 shadow-sm transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4.5 w-4.5 stroke-current stroke-2 ${wishlist.includes(p.id) ? 'fill-rose-500 text-rose-500' : 'fill-none'}`} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>

                        <span className="text-6xl group-hover:scale-110 transition-transform duration-500">
                          {getCategoryEmoji(p.category)}
                        </span>
                        
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>

                      {/* Content summary */}
                      <div className="p-4.5 space-y-2.5">
                        <div>
                          <h3 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                            {p.name}
                          </h3>
                          <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-amber-500 font-bold">
                            <span>★</span>
                            <span>{p.rating}</span>
                            <span className="text-slate-400 font-semibold">({p.id * 13 + 5} reviews)</span>
                          </div>
                        </div>

                        {/* Price details */}
                        <div className="flex items-baseline space-x-2 pt-1 border-t border-slate-50">
                          <span className="text-xs font-black text-emerald-600">
                            {Number(p.price).toLocaleString()} RWF
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold line-through">
                            {getOriginalPrice(Number(p.price)).toLocaleString()} RWF
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA container */}
                    <div className="px-4.5 pb-4.5 pt-2 flex items-center justify-between border-t border-slate-50 gap-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showToast(`Description: ${p.description || 'No description provided.'}`, 'info');
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all duration-200 cursor-pointer"
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
                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl px-4.5 py-2 text-xs font-bold shadow-sm shadow-emerald-600/10 transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer flex items-center space-x-1"
                      >
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
