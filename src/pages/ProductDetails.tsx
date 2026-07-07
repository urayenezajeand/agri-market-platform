import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/cartContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

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
  vendor_email?: string;
  discount_percent?: number;
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  // Wishlist handler states for Product Details
  const [, setWishlistTrigger] = useState(false);

  const toggleWishlist = () => {
    if (!product) return;
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

  const isInWishlist = () => {
    if (!product) return false;
    try {
      const stored = localStorage.getItem('wishlist_items');
      if (stored) {
        const list = JSON.parse(stored);
        return list.some((item: any) => item.id === product.id);
      }
    } catch(e) {}
    return false;
  };

  useEffect(() => {
    const handleSync = () => setWishlistTrigger(prev => !prev);
    window.addEventListener('wishlist-updated', handleSync);
    return () => window.removeEventListener('wishlist-updated', handleSync);
  }, []);

  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
        if (!res.ok) {
          throw new Error('Product details could not be found.');
        }
        const data = await res.json();
        setProduct(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Server error. Reba ko backend iri kwaka.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <span className="text-5xl mb-4">🍂</span>
        <h2 className="text-xl font-bold text-slate-800">Crop Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{error || 'This product was not found.'}</p>
        <Link to="/" className="mt-6 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-700">
          Back to Shop
        </Link>
      </div>
    );
  }

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const hasDiscount = product && product.discount_percent && product.discount_percent > 0;
  const productPrice = hasDiscount
    ? Math.round(Number(product.price) * (1 - (product.discount_percent || 0) / 100))
    : Number(product.price);
  const totalPrice = productPrice * quantity;

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: productPrice,
      image_url: product.image_url || '',
      vendor_id: product.vendor_id,
      stock: product.stock
    }, quantity);

    setAdded(true);
    showToast(`Added ${quantity}x ${product.name} to cart!`, 'success');
    setTimeout(() => setAdded(false), 2000);
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

  return (
    <div className="min-h-[calc(100vh-62px)] bg-slate-50/50 pb-24 pt-4 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        
        {/* BACK ACTION */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 font-bold text-xs cursor-pointer"
        >
          <span>←</span> <span>Back</span>
        </button>

        {/* DETAILS CONTAINER */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
          
          {/* LEFT: CROP IMAGE PRESENTATION */}
          <div className="w-full md:w-1/2 bg-emerald-50/40 relative min-h-[260px] md:min-h-none overflow-hidden flex items-center justify-center">
            {/* Emoji in the background */}
            <span className="absolute text-7xl sm:text-8xl select-none">
              {getCategoryEmoji(product.category)}
            </span>
            
            {/* Discount Tag */}
            {hasDiscount && (
              <div className="absolute top-3.5 left-3.5 z-10 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md animate-pulse">
                {(product.discount_percent || 0)}% OFF
              </div>
            )}

            {/* Image overlays on top */}
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-20">
                <span className="text-xs uppercase font-black tracking-wider text-white bg-slate-800/90 px-3 py-1 rounded-full">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: CROP DESCRIPTIONS & CONTROL TABS */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Category Badge */}
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  {product.category}
                </span>
                
                {product.stock > 0 ? (
                  product.stock < 5 ? (
                    <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                      Only {product.stock} left!
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      In Stock
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-full">
                    Unavailable
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {product.name}
                </h1>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Vendor: {product.vendor_name || 'Rwandan Farmer'} ({product.vendor_email || 'No contact email'})
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Description
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {product.description || 'Nta bisobanuro byatanzwe kuri iki gicuruzwa.'}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 space-y-6">
              
              {/* Price & Quantity Adjuster */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Unit Price</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-lg font-black text-slate-900">{productPrice.toLocaleString()} RWF</span>
                    {hasDiscount && (
                      <span className="text-xs text-slate-405 line-through font-bold">
                        {Number(product.price).toLocaleString()} RWF
                      </span>
                    )}
                  </div>
                </div>

                {product.stock > 0 && (
                  <div className="flex items-center space-x-3 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
                    <button
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-white border border-slate-200/50 text-slate-600 font-bold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-black w-6 text-center text-slate-800">{quantity}</span>
                    <button
                      onClick={handleIncrement}
                      disabled={quantity >= product.stock}
                      className="h-8 w-8 flex items-center justify-center rounded-xl bg-white border border-slate-200/50 text-slate-600 font-bold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Action trigger button with wishlist toggle next to it */}
              <div className="flex items-center space-x-3">
                {product.stock > 0 ? (
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 flex justify-center items-center rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer ${
                      added
                        ? 'bg-emerald-500 shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30'
                    }`}
                  >
                    {added ? (
                      <span className="flex items-center space-x-2">
                        <span>✓</span>
                        <span>Added to Cart!</span>
                      </span>
                    ) : (
                      <span>Add to Cart ({totalPrice.toLocaleString()} RWF)</span>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-400 border border-slate-200/50 cursor-not-allowed"
                  >
                    Out of Stock
                  </button>
                )}

                {/* Wishlist toggle button */}
                <button
                  onClick={toggleWishlist}
                  className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                    isInWishlist() 
                      ? 'border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100' 
                      : 'border-slate-200 bg-white text-slate-400 hover:text-rose-500 hover:border-rose-100'
                  }`}
                  title={isInWishlist() ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 stroke-current stroke-2 ${isInWishlist() ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
