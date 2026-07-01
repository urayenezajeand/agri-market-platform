
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/cartContext';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const getCategoryEmoji = (name: string) => {
    // Basic fallback heuristic based on names
    const n = name.toLowerCase();
    if (n.includes('bean') || n.includes('rice') || n.includes('wheat') || n.includes('maize') || n.includes('corn') || n.includes('grain')) return '🌾';
    if (n.includes('tomato') || n.includes('cabbage') || n.includes('onion') || n.includes('carrot') || n.includes('pepper') || n.includes('spinach')) return '🥦';
    if (n.includes('apple') || n.includes('banana') || n.includes('mango') || n.includes('orange') || n.includes('fruit') || n.includes('avocado')) return '🍎';
    if (n.includes('potato') || n.includes('cassava') || n.includes('yam') || n.includes('sweet') || n.includes('tuber')) return '🥔';
    return '🍃';
  };

  const deliveryFee = cart.length > 0 ? 1000 : 0; // Flat 1,000 RWF delivery fee
  const totalPayment = cartTotal + deliveryFee;

  return (
    <div className="min-h-[calc(100vh-62px)] bg-transparent pb-24 pt-4 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Cart</h1>
            <p className="text-xs text-slate-500 font-semibold">{cart.length} unique items</p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          // Empty Cart State
          <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center">
            <span className="text-6xl block mb-4">🛒</span>
            <h2 className="text-lg font-black text-slate-800">Your cart is empty</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              Browse our fresh crops catalogue and add some produce to your basket!
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/10 hover:bg-emerald-700 hover:shadow-lg transition-all"
            >
              Go to Marketplace
            </Link>
          </div>
        ) : (
          // Cart Items List
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0 last:pb-0 first:pt-0"
                >
                  {/* Left info */}
                  <div className="flex items-center space-x-3.5">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50/50 flex items-center justify-center text-3xl">
                      {getCategoryEmoji(item.name)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-snug">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {item.price.toLocaleString()} RWF / unit
                      </p>
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center space-x-4">
                    {/* Quantity counter */}
                    <div className="flex items-center space-x-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg bg-white text-slate-600 font-bold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-black w-5 text-center text-slate-800">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg bg-white text-slate-600 font-bold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                     {/* Delete Item */}
                     <button
                       onClick={() => removeFromCart(item.id)}
                       className="h-8 w-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer"
                       title="Remove crop"
                     >
                       <span className="text-xs">🗑️</span>
                     </button>
                   </div>
                 </div>
               ))}
             </div>
 
             {/* Billing Summary */}
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
               <h2 className="text-sm font-black text-slate-800">Order Summary</h2>
               
               <div className="space-y-2 text-xs font-semibold text-slate-600">
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
 
               <div className="pt-2">
                 <button
                   onClick={() => navigate('/checkout')}
                   className="w-full flex justify-center items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer"
                 >
                   Proceed to Checkout
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
