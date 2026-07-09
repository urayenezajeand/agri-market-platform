import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { isVendor } = useAuth();

  return (
    <footer className="bg-slate-900 text-slate-400 font-sans border-t border-slate-800">
      
      {/* 1. TOP NEWSLETTER / MARKETING BANNER */}
      <div className="bg-emerald-950 border-b border-emerald-900/40 py-8 px-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Join our farming community
            </h3>
            <p className="text-xs text-emerald-200/70 font-semibold">
              Get weekly updates on harvest seasons, crop price drops, and vendor guides.
            </p>
          </div>
          <div className="flex w-full md:max-w-md items-center bg-emerald-900/30 rounded-xl overflow-hidden border border-emerald-800 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all p-1">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="w-full bg-transparent text-xs text-white px-3 focus:outline-none placeholder-emerald-400 font-semibold"
            />
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN FOOTER CONTENTS */}
      <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Brand details */}
        <div className="lg:col-span-5 space-y-4">
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight">
            {/* Leaf Logo SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-500 fill-current" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.12 5 19c2.88-.9 9-3 11-12h1zm2-3c-3 1-13.22 4.78-15 16 0 0 2.22-11.22 16-15.5V5zM4.5 19A1.5 1.5 0 113 20.5 1.5 1.5 0 014.5 19z"/>
            </svg>
            <span className="text-white font-black text-xl tracking-tight">
              Agri<span className="text-emerald-500">Market</span>
            </span>
          </Link>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold max-w-sm">
            AgriMarket is a digital marketplace connecting Rwanda's local farmers with urban consumers. We enable fair pricing, direct-to-consumer farm listings, and secure mobile shipping tracking.
          </p>
          
          {/* Social Links Icons */}
          <div className="flex space-x-3 pt-2">
            <a href="#" className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95">
              <span className="text-xs">FB</span>
            </a>
            <a href="#" className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95">
              <span className="text-xs">TW</span>
            </a>
            <a href="#" className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95">
              <span className="text-xs">IG</span>
            </a>
          </div>
        </div>

        {/* Categories column */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-2">
            Categories
          </h4>
          <ul className="space-y-2 text-xs font-bold">
            <li>
              <Link to="/products?category=Vegetables" className="hover:text-emerald-500 transition-colors">
                Vegetables (Imboga)
              </Link>
            </li>
            <li>
              <Link to="/products?category=Grains" className="hover:text-emerald-500 transition-colors">
                Grains (Ibinyampeke)
              </Link>
            </li>
            <li>
              <Link to="/products?category=Fruits" className="hover:text-emerald-500 transition-colors">
                Fruits (Imbuto)
              </Link>
            </li>
            <li>
              <Link to="/products?category=Tubers" className="hover:text-emerald-500 transition-colors">
                Tubers (Ibijumba)
              </Link>
            </li>
          </ul>
        </div>

        {/* Services column */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-2">
            Services
          </h4>
          <ul className="space-y-2 text-xs font-bold">
            <li>
              <Link to="/products" className="hover:text-emerald-500 transition-colors">
                Browse Shop
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-emerald-500 transition-colors">
                Track Purchases
              </Link>
            </li>
            <li>
              <Link to={isVendor ? "/vendor/dashboard" : "/register?role=vendor"} className="hover:text-emerald-500 transition-colors">
                Farmer Center
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-emerald-500 transition-colors">
                Shopping Cart
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact info column */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-2">
            Contact
          </h4>
          <ul className="space-y-2 text-xs font-bold leading-normal">
            <li className="flex items-start space-x-2">
              <span className="text-emerald-500">📍</span>
              <span>Nyanza, Busasamana kuri 40</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">📞</span>
              <span>0781664354</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-emerald-500">✉️</span>
              <span className="hover:text-emerald-500 cursor-pointer">support@agrimarket.rw</span>
            </li>
          </ul>
        </div>

      </div>

      {/* 3. BOTTOM FOOTER STRIP */}
      <div className="bg-slate-950 border-t border-slate-900 py-6 px-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-bold">
          
          <div>
            &copy; {new Date().getFullYear()} AgriMarket Platform. All rights reserved. Final Academic Project.
          </div>

          {/* Secure Payment icons (mockups) */}
          <div className="flex items-center space-x-3 select-none">
            <span className="text-slate-650 text-[9px] uppercase tracking-wider mr-1">Accepted Payments:</span>
            
            {/* MTN MoMo badge mockup */}
            <div className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black text-[8px] border border-amber-300 tracking-tighter">
              MTN MoMo
            </div>
            
            {/* Cash on Delivery badge mockup */}
            <div className="bg-slate-805 text-slate-300 px-2 py-0.5 rounded font-black text-[8px] border border-slate-800 tracking-tighter">
              CASH ON DELIVERY
            </div>
          </div>

        </div>
      </div>

    </footer>
  );
}
