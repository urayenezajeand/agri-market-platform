import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/cartContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

export default function Navbar() {
  const { user, logout, isAuthenticated, isVendor } = useAuth();
  const { cartCount, addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initialize search input state from current query parameter if present
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // Wishlist Drawer States
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Load wishlist on init and register event listeners
  const loadWishlist = () => {
    try {
      const stored = localStorage.getItem('wishlist_items');
      if (stored) {
        setWishlist(JSON.parse(stored));
      } else {
        setWishlist([]);
      }
    } catch (e) {
      setWishlist([]);
    }
  };

  useEffect(() => {
    loadWishlist();
    const handleWishlistUpdate = () => loadWishlist();
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlist-updated', handleWishlistUpdate);
  }, []);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully.', 'info');
    navigate('/login');
  };

  // Search Autocomplete Suggestion States
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Pre-fetch all products for filtering suggestions
  useEffect(() => {
    const fetchAllProductsForSearch = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (res.ok) {
          const data = await res.json();
          setAllProducts(data);
        }
      } catch (e) {
        console.error('Failed to pre-fetch search products list:', e);
      }
    };
    fetchAllProductsForSearch();
  }, []);

  // Listen for outside clicks to close suggestion dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#search-form-container')) {
        setSuggestions([]);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (value.trim().length >= 1) {
      const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(value.toLowerCase()) || 
        p.category.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestions([]);
    navigate(`/?search=${encodeURIComponent(searchInput.trim())}`);
  };

  return (
    <>
      {/* 1. CLEAN MODERN UNIFIED HEADER */}
      <header className="bg-white border-b border-[#DFDACA] text-stone-800 px-4 py-3.5 shadow-sm z-50 sticky top-0">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          
          {/* Logo & Mobile Menu Buttons */}
          <div className="flex items-center space-x-6 shrink-0">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight">
              {/* Leaf Logo SVG (Emerald green) */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-600 fill-current" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
              </svg>
              <span className="text-slate-900 font-black text-xl tracking-tight">
                Agri<span className="text-emerald-600">Market</span>
              </span>
            </Link>
          </div>

          {/* 2. Unified Navigation Links (Desktop only, hidden on mobile) */}
          <div className="hidden lg:flex items-center space-x-5 text-xs font-bold text-stone-600 whitespace-nowrap">
            <Link to="/products" className="hover:text-emerald-600 transition-colors">Shop</Link>
            <Link to="/deals" className="text-amber-600 font-extrabold hover:text-amber-705 transition-colors">Daily Deals</Link>
            <Link to="/orders" className="hover:text-emerald-600 transition-colors">Track Order</Link>
            <Link to="/?filter=blogs" className="hover:text-emerald-600 transition-colors">Blogs</Link>
            <Link to={isVendor ? "/vendor/dashboard" : "/register?role=vendor"} className="text-orange-600 font-black hover:text-orange-705 transition-colors">Sell on AgriMarket</Link>
          </div>

          {/* 3. Central Search Bar with Autocomplete Suggestions */}
          <div className="flex-1 max-w-xs relative hidden md:block" id="search-form-container">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center bg-slate-50 rounded-xl overflow-hidden border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
              <input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-transparent text-slate-800 text-xs px-3.5 py-2.5 focus:outline-none placeholder-slate-400 font-semibold"
              />
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 font-bold transition-all text-xs cursor-pointer flex items-center"
              >
                {/* Search glass SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* Search Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/50 z-50 overflow-hidden divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                  Suggested Products
                </div>
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSearchInput(item.name);
                      setSuggestions([]);
                      navigate(`/product/${item.id}`);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      {/* Thumbnail with soft gradient background */}
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-slate-100 flex items-center justify-center relative overflow-hidden select-none text-xs">
                        <span>
                          {item.category === 'Vegetables' ? '🥦' : item.category === 'Grains' ? '🌾' : item.category === 'Fruits' ? '🍎' : '🥔'}
                        </span>
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="absolute inset-0 h-full w-full object-cover" 
                          />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug truncate max-w-[120px]">{item.name}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-emerald-600">
                        {Number(item.price).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Accounts & lists, Wishlist, Cart */}
          <div className="flex items-center space-x-4 md:space-x-6 text-sm shrink-0">
            {/* Account Sign In */}
            {isAuthenticated ? (
              <div className="text-left text-xs hidden sm:block">
                <p className="text-slate-400">Hello, {user?.name.split(' ')[0]}</p>
                <div className="flex items-center space-x-1.5 flex-wrap max-w-[170px]">
                  <Link to="/orders" className="font-bold text-emerald-600 hover:underline">
                    My Orders
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link to="/settings" className="font-bold text-stone-600 hover:text-emerald-600 hover:underline">
                    Settings
                  </Link>
                  <span className="text-slate-300">•</span>
                  <button onClick={handleLogout} className="font-bold text-slate-800 hover:text-rose-600 hover:underline text-left cursor-pointer">
                    Logout
                  </button>
                  {isVendor && (
                    <>
                      <span className="text-slate-300">•</span>
                      <Link to="/vendor/dashboard" className="font-bold text-orange-600 hover:underline">
                        Dashboard
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <Link to="/login" className="text-left text-xs hover:text-emerald-600 transition-colors flex flex-col hidden sm:flex">
                <span className="text-slate-400">Hello, sign in</span>
                <span className="font-bold text-slate-800 text-xs">Accounts & List</span>
              </Link>
            )}

            {/* Wishlist */}
            <div 
              onClick={() => setIsWishlistOpen(true)}
              className="relative cursor-pointer text-xs text-center text-slate-500 hover:text-emerald-600 flex flex-col items-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-current fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="font-semibold mt-0.5 hidden md:block">Wishlist</p>
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-sm">
                  {wishlist.length}
                </span>
              )}
            </div>

            {/* Cart Button */}
            <Link to="/cart" className="relative flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-2.5 rounded-xl border border-emerald-100 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-700 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-left text-xs leading-tight hidden md:block">
                <p className="text-[9px] text-emerald-600 font-bold">Cart</p>
                <p className="font-black text-emerald-950">{cartCount} items</p>
              </div>
              {cartCount > 0 && (
                <span className="absolute md:hidden -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white shadow-sm animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* 2. SUBHEADER LINKS (Mobile/Tablet only, hidden on desktop lg:hidden) */}
      <nav className="bg-[#EAE5D8] border-b border-[#DFDACA] py-3 px-4 overflow-x-auto lg:hidden">
        <div className="mx-auto max-w-7xl flex items-center space-x-6 text-xs sm:text-sm font-semibold text-slate-600 whitespace-nowrap">
          <Link to="/products" className="text-emerald-600 font-bold flex items-center space-x-2 hover:text-emerald-700 transition-colors">
            {/* Hamburger SVG */}
            <svg xmlns="http://www.w3.org/2055/svg" className="h-4.5 w-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>All Categories</span>
          </Link>
          
          {/* Vertical Divider */}
          <div className="h-4 w-px bg-slate-250"></div>
          
          <Link 
            to="/products" 
            className="relative pb-0.5 hover:text-emerald-600 transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-emerald-600 hover:after:w-full after:transition-all after:duration-300"
          >
            Shop
          </Link>
          <Link 
            to="/deals" 
            className="relative pb-0.5 text-amber-600 font-bold hover:text-amber-700 transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-amber-600 hover:after:w-full after:transition-all after:duration-300"
          >
            Daily Deals
          </Link>
          <Link 
            to="/orders" 
            className="relative pb-0.5 hover:text-emerald-600 transition-colors duration-200 flex items-center space-x-1.5 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-emerald-600 hover:after:w-full after:transition-all after:duration-300"
          >
            {/* Truck SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 011-1v-4a1 1 0 01.4-.8l2.28-2.28A1 1 0 0117.3 8H20a1 1 0 011 1v7a1 1 0 01-1 1h-1m-6 0a2 2 0 00-4 0m9 0a2 2 0 00-4 0" />
            </svg>
            <span>Track Order</span>
          </Link>
          <Link 
            to="/?filter=blogs" 
            className="relative pb-0.5 hover:text-emerald-600 transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-emerald-600 hover:after:w-full after:transition-all after:duration-300"
          >
            Blogs
          </Link>
          <Link 
            to={isVendor ? "/vendor/dashboard" : "/register?role=vendor"} 
            className="relative pb-0.5 text-orange-600 font-black hover:text-orange-700 transition-colors duration-200 flex items-center space-x-1.5 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-orange-600 hover:after:w-full after:transition-all after:duration-300"
          >
            {/* Store/Shop SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Sell on AgriMarket</span>
          </Link>
        </div>
      </nav>

      {/* Wishlist Drawer */}
      {isWishlistOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsWishlistOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-xl border-l border-slate-100 flex flex-col justify-between animate-slideLeft">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <span>❤️</span>
                  <span>My Wishlist ({wishlist.length})</span>
                </h2>
                <button 
                  onClick={() => setIsWishlistOpen(false)}
                  className="text-slate-400 hover:text-slate-650 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {wishlist.length === 0 ? (
                  <div className="text-center py-20 space-y-3">
                    <span className="text-5xl block">🌾</span>
                    <h3 className="text-sm font-bold text-slate-650">Your wishlist is empty</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                      Crops you save by clicking the heart button on listing cards will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {wishlist.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center space-x-3">
                          {/* Image Thumbnail with fallback gradient */}
                          <div className="h-12 w-12 rounded-lg bg-emerald-50 border border-slate-100 flex items-center justify-center relative overflow-hidden select-none">
                            <span className="text-xl">
                              {item.category === 'Vegetables' ? '🥦' : item.category === 'Grains' ? '🌾' : item.category === 'Fruits' ? '🍎' : '🥔'}
                            </span>
                            {item.image_url && (
                              <img 
                                src={item.image_url} 
                                alt={item.name} 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                className="absolute inset-0 h-full w-full object-cover" 
                              />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{item.name}</h4>
                            <p className="text-xs text-emerald-600 font-extrabold">{Number(item.price).toLocaleString()} RWF</p>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Add to Cart
                              addToCart({
                                id: item.id,
                                name: item.name,
                                price: Number(item.price),
                                image_url: item.image_url || '',
                                vendor_id: item.vendor_id,
                                stock: item.stock
                              }, 1);
                              
                              // Remove from wishlist
                              const updated = wishlist.filter((w) => w.id !== item.id);
                              localStorage.setItem('wishlist_items', JSON.stringify(updated));
                              window.dispatchEvent(new Event('wishlist-updated'));
                              showToast(`Moved ${item.name} to cart!`, 'success');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold shadow-sm transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer"
                          >
                            Add to Cart
                          </button>
                          
                          <button
                            onClick={() => {
                              const updated = wishlist.filter((w) => w.id !== item.id);
                              localStorage.setItem('wishlist_items', JSON.stringify(updated));
                              window.dispatchEvent(new Event('wishlist-updated'));
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer text-xs"
                            title="Remove"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={() => setIsWishlistOpen(false)}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white rounded-xl py-3 text-xs font-bold shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center"
                >
                  Continue Shopping
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
