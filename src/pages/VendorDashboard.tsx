import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
  vendor_id: number;
  discount_percent?: number;
}

interface SaleOrder {
  id: number; // item id
  order_id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  created_at: string;
  status: string;
  shipping_address: string;
  phone: string;
  buyer_name: string;
  buyer_email: string;
}

export default function VendorDashboard() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard navigation tab (extended to include deals and reports)
  const [activeTab, setActiveTab] = useState<'overview' | 'crops' | 'orders' | 'deals' | 'reports'>('overview');
  
  // Sidebar responsive drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Store local discount adjustments to avoid violating Rules of Hooks
  const [pendingDiscounts, setPendingDiscounts] = useState<{ [productId: number]: number }>({});

  // CRUD Flash Deal modal state
  const [createDealModalOpen, setCreateDealModalOpen] = useState(false);
  const [selectedDealProductId, setSelectedDealProductId] = useState('');
  const [dealDiscountPercent, setDealDiscountPercent] = useState('10');

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [imageUrl, setImageUrl] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch products and sales of this vendor
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Fetch public products and filter by vendor_id in frontend
      const prodRes = await fetch(`${API_BASE_URL}/api/products`);
      if (!prodRes.ok) throw new Error('Could not load crops catalog.');
      const allProducts = await prodRes.json();
      const myProducts = allProducts.filter((p: any) => p.vendor_id === user?.id);
      setProducts(myProducts);

      // 2. Fetch sales orders linked to this vendor's crops
      const salesRes = await fetch(`${API_BASE_URL}/api/orders/vendor`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!salesRes.ok) throw new Error('Could not load sales orders.');
      const salesData = await salesRes.json();
      setSales(salesData);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Guhuza na server byanze.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchData();
    }
  }, [token, user]);

  // Open modal for creating a new product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setStock('');
    setCategory('Vegetables');
    setImageUrl('');
    setDiscountPercent('0');
    setFormError('');
    setModalOpen(true);
  };

  // Open modal for editing a product
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setPrice(p.price.toString());
    setStock(p.stock.toString());
    setCategory(p.category);
    setImageUrl(p.image_url || '');
    setDiscountPercent(p.discount_percent?.toString() || '0');
    setFormError('');
    setModalOpen(true);
  };

  // Create or Update crop API handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const payload = {
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      category,
      image_url: imageUrl || undefined,
      discount_percent: Number(discountPercent) || 0
    };

    try {
      const url = editingProduct
        ? `${API_BASE_URL}/api/products/${editingProduct.id}`
        : `${API_BASE_URL}/api/products`;
      
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product.');
      }

      setModalOpen(false);
      showToast(editingProduct ? 'Crop updated successfully!' : 'New crop listed successfully!', 'success');
      fetchData(); // Reload list
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Saving crop details failed.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Ese urashaka gusiba iki gicuruzwa burundu? (Are you sure you want to delete this crop?)')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product.');
      }

      showToast('Crop listing deleted successfully.', 'info');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gusiba byanze.', 'error');
    }
  };

  // Update customer order status
  const handleUpdateOrderStatus = async (orderId: number, currentStatus: string) => {
    let nextStatus = 'pending';
    if (currentStatus === 'pending') nextStatus = 'shipped';
    else if (currentStatus === 'shipped') nextStatus = 'delivered';
    else return; // Out of steps

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order status.');
      }

      showToast(`Order marked as ${nextStatus}!`, 'success');
      fetchData(); // Reload orders
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Guhindura status byanze.', 'error');
    }
  };

  // Calculate Overview Stats
  const activeListingsCount = products.length;
  const totalOrdersCount = Array.from(new Set(sales.map(s => s.order_id))).length;
  
  // Total earnings = Sum of item subtotals for all non-cancelled orders
  const totalEarnings = sales
    .filter(s => s.status !== 'cancelled')
    .reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  // Generate dynamic client-side CSV report
  const generateCsvReport = () => {
    let csv = "REPORT,AGRI-MARKET VENDOR HARVEST & AUDIT REPORT\n";
    csv += `Generated On,${new Date().toLocaleString()}\n`;
    csv += `Vendor,Farmer ${user?.name || 'Rwandan Farmer'} (${user?.email || 'No email'})\n\n`;
    
    // Inventory section
    csv += "=== CROP CATALOGUE INVENTORY ===\n";
    csv += "Crop ID,Crop Name,Category,Price (RWF),Stock Level,Discount (%)\n";
    products.forEach(p => {
      csv += `${p.id},"${p.name.replace(/"/g, '""')}",${p.category},${p.price},${p.stock},${p.discount_percent || 0}\n`;
    });
    
    csv += "\n=== SALES ORDERS AUDIT ===\n";
    csv += "Order ID,Crop Name,Price (RWF),Quantity,Subtotal (RWF),Status,Order Date,Buyer Name,Buyer Phone,Shipping Address\n";
    sales.forEach(s => {
      const subtotal = Number(s.price) * s.quantity;
      csv += `${s.order_id},"${s.product_name.replace(/"/g, '""')}",${s.price},${s.quantity},${subtotal},${s.status},${new Date(s.created_at).toLocaleDateString()},"${s.buyer_name}","${s.phone}","${s.shipping_address.replace(/"/g, '""')}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `agrimarket_report_${(user?.name || 'farmer').replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Audit report CSV generated and downloaded!", "success");
  };

  // Group sales by date for line chart plotting
  const getSalesChartData = () => {
    const dataByDate: { [key: string]: number } = {};
    sales
      .filter(s => s.status !== 'cancelled')
      .forEach(s => {
        const dateStr = new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        dataByDate[dateStr] = (dataByDate[dateStr] || 0) + (Number(s.price) * s.quantity);
      });
    
    return Object.entries(dataByDate)
      .map(([date, amount]) => ({ date, amount }))
      .slice(-7);
  };

  // Group crops by category for visual bars
  const getCategoryCountData = () => {
    const cats = ['Vegetables', 'Grains', 'Fruits', 'Tubers', 'Other'];
    const dataByCat: { [key: string]: number } = { Vegetables: 0, Grains: 0, Fruits: 0, Tubers: 0, Other: 0 };
    products.forEach(p => {
      const catName = cats.includes(p.category) ? p.category : 'Other';
      dataByCat[catName] = (dataByCat[catName] || 0) + 1;
    });
    return dataByCat;
  };

  // Sidebar navigation options
  const sidebarLinks = [
    { id: 'overview', title: 'Dashboard Overview', icon: '📊' },
    { id: 'crops', title: 'My Crops Catalogue', icon: '🥦' },
    { id: 'orders', title: 'Customer Orders', icon: '📦' },
    { id: 'deals', title: 'Flash Sales / Deals', icon: '⚡' },
    { id: 'reports', title: 'Reports & Auditing', icon: '📋' },
  ] as const;

  const chartData = getSalesChartData();
  const categoryCounts = getCategoryCountData();

  // Find max value for scaling charts
  const maxSaleAmount = chartData.length > 0 ? Math.max(...chartData.map(d => d.amount)) : 1;
  const maxCropsCount = Math.max(...Object.values(categoryCounts), 1);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-62px)] bg-slate-50/50">
      
      {/* 1. MOBILE HEADER BAR */}
      <div className="flex md:hidden items-center justify-between bg-slate-900 text-white px-5 py-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🌾</span>
          <span className="text-sm font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">AgriMarket Portal</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 text-slate-400 hover:text-white focus:outline-none cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* 2. SIDEBAR DRAWER - MOBILE & TABLET */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop overlay */}
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-white pt-5 pb-4 px-6 shadow-xl z-50">
            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌾</span>
                <span className="text-sm font-black tracking-tight">AgriMarket Portal</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <nav className="space-y-1.5 flex-1">
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === link.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{link.icon}</span>
                  <span>{link.title}</span>
                </button>
              ))}
            </nav>
            
            <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500 font-semibold">
              <p>Logged in as:</p>
              <p className="text-slate-300 truncate mt-0.5">{user?.email}</p>
            </div>
          </aside>
        </div>
      )}

      {/* 3. SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 md:block hidden min-h-[calc(100vh-62px)]">
        <div className="p-6">
          <div className="flex items-center space-x-2.5 mb-8">
            <span className="text-2xl">🌾</span>
            <span className="text-base font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">AgriMarket Portal</span>
          </div>
          
          <nav className="space-y-1.5">
            {sidebarLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === link.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-sm">{link.icon}</span>
                <span>{link.title}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6 border-t border-slate-800 text-[10px] text-slate-500 font-semibold">
          <p>Logged in as:</p>
          <p className="text-slate-300 truncate mt-0.5">{user?.email}</p>
        </div>
      </aside>

      {/* 4. MAIN CONTAINER */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl w-full mx-auto space-y-8">
        
        {/* Dashboard Main Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-4 border-b border-slate-200/60">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {sidebarLinks.find(l => l.id === activeTab)?.title}
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-2">
              Welcome back, Farmer {user?.name || 'Rwandan Seller'}
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center space-x-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-xs font-bold shadow-lg shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
            >
              <span>🌾</span>
              <span>Add New Crop</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100 text-center text-xs text-rose-800 font-semibold mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* OVERVIEW PANEL */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* KPI Metrics row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  
                  {/* Card 1 */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Earnings</span>
                      <h2 className="text-xl font-black text-emerald-600">{totalEarnings.toLocaleString()} RWF</h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl">💰</div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crops Listed</span>
                      <h2 className="text-xl font-black text-slate-800">{activeListingsCount} Crops</h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-xl">🌱</div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orders Received</span>
                      <h2 className="text-xl font-black text-slate-800">{totalOrdersCount} Orders</h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-xl">📦</div>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Flash Sales</span>
                      <h2 className="text-xl font-black text-amber-600">
                        {products.filter(p => p.discount_percent && p.discount_percent > 0).length} Active
                      </h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-xl">⚡</div>
                  </div>

                </div>

                {/* Analytical Charts Block */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* CHART 1: LINE SALES SVG GRAPH */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Earnings Over Time</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Daily subtotal analysis for recent purchases</p>
                    </div>

                    {chartData.length === 0 ? (
                      <div className="h-48 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                        <span className="text-xs text-slate-400 font-semibold">No recent sales records for charts</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* SVG Bar Chart for ease of implementation & extreme precision */}
                        <div className="h-44 flex items-end justify-between space-x-2 pt-6">
                          {chartData.map((d, index) => {
                            const percent = (d.amount / maxSaleAmount) * 100;
                            return (
                              <div key={index} className="flex-1 flex flex-col items-center space-y-2 group">
                                <div className="text-[9px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 px-1 rounded">
                                  {d.amount.toLocaleString()} RWF
                                </div>
                                <div 
                                  style={{ height: `${Math.max(percent, 8)}%` }}
                                  className="w-full bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-all duration-300 cursor-pointer shadow-sm relative"
                                ></div>
                                <span className="text-[9px] font-bold text-slate-400 truncate max-w-[60px]">
                                  {d.date}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CHART 2: CATEGORY SEGMENTATION BARS */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Catalogue Segmentation</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Crops distribution metrics by category</p>
                    </div>

                    <div className="space-y-4.5 pt-2">
                      {Object.entries(categoryCounts).map(([cat, count], idx) => {
                        const percent = (count / maxCropsCount) * 100;
                        const colors = [
                          'bg-emerald-500', // Vegetables
                          'bg-amber-500',   // Grains
                          'bg-rose-500',    // Fruits
                          'bg-yellow-500',  // Tubers
                          'bg-slate-400'    // Other
                        ];

                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-650 flex items-center space-x-1.5">
                                <span>{cat === 'Vegetables' ? '🥦' : cat === 'Grains' ? '🌾' : cat === 'Fruits' ? '🍎' : cat === 'Tubers' ? '🥔' : '🍃'}</span>
                                <span>{cat}</span>
                              </span>
                              <span className="text-slate-800">{count} Listed</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${percent}%` }}
                                className={`h-full rounded-full transition-all duration-500 ${colors[idx % colors.length]}`}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Info summary tips */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-black text-slate-850 mb-4">Market Operations Tips</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-650 font-semibold leading-relaxed">
                    <div className="space-y-1.5">
                      <span className="text-lg">📈 Grow Sales</span>
                      <p>Setting crops as "Flash Sales" highlights them under Daily Deals with discount tags, which doubles user clicks!</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-lg">📦 Quick Shipping</span>
                      <p>Always mark orders as "Shipped" and provide delivery updates immediately to earn top seller ratings.</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-lg">📋 Dynamic Auditing</span>
                      <p>Download the CSV report regularly to audit crop inventories and keep track of your cash flows.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CATALOGUE TAB PANEL */}
            {activeTab === 'crops' && (
              <div className="space-y-4">
                {products.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center">
                    <span className="text-5xl block mb-4">🌾</span>
                    <h3 className="text-sm font-bold text-slate-700">No crops listed yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Click the "Add New Crop" button in the top right to start selling your products.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="p-5">Crop</th>
                            <th className="p-5">Category</th>
                            <th className="p-5">Price (RWF)</th>
                            <th className="p-5">Stock Level</th>
                            <th className="p-5">Discount Status</th>
                            <th className="p-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-650">
                          {products.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-5 flex items-center space-x-3.5">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl overflow-hidden border border-slate-200">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  ) : (
                                    <span>{p.category === 'Grains' ? '🌾' : p.category === 'Vegetables' ? '🥦' : p.category === 'Fruits' ? '🍎' : '🥔'}</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{p.name}</span>
                                  <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 max-w-[180px]">{p.description}</span>
                                </div>
                              </td>
                              <td className="p-5">
                                <span className="inline-block bg-slate-100 text-slate-600 rounded-md px-2.5 py-0.5 text-[10px] uppercase font-black tracking-wider">
                                  {p.category}
                                </span>
                              </td>
                              <td className="p-5 text-slate-950 font-bold">{p.price.toLocaleString()} RWF</td>
                              <td className="p-5">
                                <span className={`${p.stock < 10 ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                                  {p.stock} units
                                </span>
                              </td>
                              <td className="p-5">
                                {p.discount_percent && p.discount_percent > 0 ? (
                                  <span className="inline-flex items-center space-x-1.5 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-amber-100">
                                    <span>⚡</span>
                                    <span>{p.discount_percent}% Off</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium">No discount</span>
                                )}
                              </td>
                              <td className="p-5 text-right space-x-2">
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl border border-emerald-100 transition-all cursor-pointer inline-block"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl border border-rose-100 transition-all cursor-pointer inline-block"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOMER ORDERS TAB PANEL */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {sales.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center">
                    <span className="text-5xl block mb-4">📦</span>
                    <h3 className="text-sm font-bold text-slate-700">No orders received yet</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Customer orders placed for your listed crops will populate here immediately.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3.5">
                          {/* Order ID & Status */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Order ID</span>
                              <span className="text-xs font-black text-slate-800">#{sale.order_id}</span>
                            </div>
                            
                            <span
                              className={`text-[9px] uppercase font-black tracking-wider px-3 py-1 rounded-full ${
                                sale.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : sale.status === 'shipped'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : sale.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-orange-100 text-orange-850 border border-orange-200'
                              }`}
                            >
                              {sale.status}
                            </span>
                          </div>

                          {/* Details details */}
                          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wide block mb-0.5">Crop Item</span>
                              <span className="text-slate-900 font-extrabold">{sale.product_name}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wide block mb-0.5">Quantity</span>
                              <span className="text-slate-900 font-extrabold">{sale.quantity} units</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wide block mb-0.5">Earning</span>
                              <span className="text-emerald-600 font-black">{(Number(sale.price) * sale.quantity).toLocaleString()} RWF</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wide block mb-0.5">Order Date</span>
                              <span className="text-slate-900 font-bold">{new Date(sale.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Buyer info box */}
                          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-xs font-semibold text-slate-655 space-y-1">
                            <p className="truncate"><span className="text-slate-400">Buyer:</span> {sale.buyer_name} ({sale.buyer_email})</p>
                            <p><span className="text-slate-400">Phone:</span> {sale.phone}</p>
                            <p className="truncate"><span className="text-slate-400">Shipping:</span> {sale.shipping_address}</p>
                          </div>
                        </div>

                        {/* Status updates button */}
                        {sale.status !== 'delivered' && sale.status !== 'cancelled' && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleUpdateOrderStatus(sale.order_id, sale.status)}
                              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97] shadow shadow-emerald-600/10 cursor-pointer"
                            >
                              {sale.status === 'pending' && 'Mark as Shipped 🚚'}
                              {sale.status === 'shipped' && 'Mark as Delivered / Completed ✓'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DAILY DEALS / FLASH SALES TAB PANEL (CRUD Interface) */}
            {activeTab === 'deals' && (
              <div className="space-y-6">
                
                {/* 1. Header Banner & Action Button */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Active Flash Sales & Daily Deals</h3>
                    <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                      Manage active discounts on your crop items. Creating a flash sale adds it directly to the customer "Daily Deals" catalog page.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const discountable = products.filter(p => !p.discount_percent || p.discount_percent === 0);
                      if (discountable.length === 0) {
                        showToast("All your catalog crops already have active discounts!", "info");
                        return;
                      }
                      setSelectedDealProductId(discountable[0].id.toString());
                      setDealDiscountPercent('10');
                      setCreateDealModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center space-x-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-955 px-5 py-3 text-xs font-black shadow-lg shadow-amber-500/10 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Create Flash Sale</span>
                  </button>
                </div>

                {/* 2. Read: Active Flash Sales List */}
                {products.filter(p => p.discount_percent && p.discount_percent > 0).length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm text-center">
                    <span className="text-5xl block mb-4">⚡</span>
                    <h3 className="text-sm font-bold text-slate-700">No active flash sales right now</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Click the "Create Flash Sale" button to select a crop from your catalogue and set up a deal.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {products
                      .filter(p => p.discount_percent && p.discount_percent > 0)
                      .map((p) => {
                        const currentDiscount = pendingDiscounts[p.id] !== undefined ? pendingDiscounts[p.id] : (p.discount_percent || 0);
                        const discountedPrice = Number(p.price) * (1 - currentDiscount / 100);

                        // Update Deal API Handler
                        const updateDiscountAPI = async (newVal: number) => {
                          const payload = {
                            name: p.name,
                            description: p.description,
                            price: p.price,
                            stock: p.stock,
                            category: p.category,
                            image_url: p.image_url,
                            discount_percent: newVal
                          };
                          try {
                            const res = await fetch(`${API_BASE_URL}/api/products/${p.id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(payload)
                            });
                            if (!res.ok) throw new Error("Failed to update discount.");
                            showToast(newVal === 0 ? `Removed discount for ${p.name}!` : `Updated discount for ${p.name} to ${newVal}%!`, "success");
                            
                            // Reset local pending changes for this product
                            setPendingDiscounts(prev => {
                              const copy = { ...prev };
                              delete copy[p.id];
                              return copy;
                            });
                            fetchData();
                          } catch (e: any) {
                            showToast(e.message || "Failed to update discount.", "error");
                          }
                        };

                        return (
                          <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden">
                            
                            {/* Visual diagonal badge decoration */}
                            <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[9px] tracking-wider uppercase py-1 px-3.5 rounded-bl-2xl">
                              Active Deal
                            </div>

                            <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                              <div>
                                <h4 className="text-sm font-black text-slate-900 leading-snug">{p.name}</h4>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">{p.category}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase block">Base Price</span>
                                <span className="text-slate-900">{Number(p.price).toLocaleString()} RWF</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase block">Discounted Price</span>
                                <span className="text-emerald-600 font-extrabold">{Math.round(discountedPrice).toLocaleString()} RWF</span>
                              </div>
                            </div>

                            <div className="space-y-2 pt-2">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500">Edit Discount Amount</span>
                                <span className="text-amber-600 font-extrabold">{currentDiscount}% OFF</span>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={currentDiscount}
                                onChange={(e) => setPendingDiscounts(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                                className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                                <span>5% Min</span>
                                <span>50% Max</span>
                              </div>
                            </div>

                            <div className="flex justify-between pt-2 border-t border-slate-50">
                              <button
                                onClick={() => updateDiscountAPI(0)} // Delete Deal
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2.5 rounded-xl border border-rose-100 transition-all cursor-pointer shadow-sm shadow-rose-100/10 animate-fade-in"
                              >
                                Delete Deal
                              </button>
                              
                              <button
                                onClick={() => updateDiscountAPI(currentDiscount)} // Update Deal
                                disabled={currentDiscount === p.discount_percent}
                                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer ${
                                  currentDiscount === p.discount_percent
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                                }`}
                              >
                                {currentDiscount === p.discount_percent ? 'Saved ✓' : 'Update Deal ⚡'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* 3. Create Deal Modal */}
                {createDealModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 border border-slate-100">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">Create Flash Sale</h3>
                        <p className="text-xs text-slate-500 font-semibold mt-1">Select an active crop listing and set its discount rate.</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                            Choose Crop Listing
                          </label>
                          <select
                            value={selectedDealProductId}
                            onChange={(e) => setSelectedDealProductId(e.target.value)}
                            className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all font-semibold"
                          >
                            {products
                              .filter(p => !p.discount_percent || p.discount_percent === 0)
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({Number(p.price).toLocaleString()} RWF)
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-500">Discount Amount</span>
                            <span className="text-amber-600 font-extrabold">{dealDiscountPercent}% OFF</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            step="5"
                            value={dealDiscountPercent}
                            onChange={(e) => setDealDiscountPercent(e.target.value)}
                            className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                            <span>5% Min</span>
                            <span>50% Max</span>
                          </div>
                        </div>

                        <div className="flex space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setCreateDealModalOpen(false)}
                            className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          
                          <button
                            type="button"
                            onClick={async () => {
                              const targetId = Number(selectedDealProductId);
                              const targetCrop = products.find(p => p.id === targetId);
                              if (!targetCrop) return;

                              const payload = {
                                name: targetCrop.name,
                                description: targetCrop.description,
                                price: targetCrop.price,
                                stock: targetCrop.stock,
                                category: targetCrop.category,
                                image_url: targetCrop.image_url,
                                discount_percent: Number(dealDiscountPercent)
                              };

                              try {
                                const res = await fetch(`${API_BASE_URL}/api/products/${targetId}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  },
                                  body: JSON.stringify(payload)
                                });
                                if (!res.ok) throw new Error("Failed to create discount.");
                                showToast(`Flash sale created for ${targetCrop.name}!`, "success");
                                setCreateDealModalOpen(false);
                                fetchData();
                              } catch (e: any) {
                                showToast(e.message || "Failed to create deal.", "error");
                              }
                            }}
                            className="flex-1 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            Create Deal ⚡
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AUDIT REPORTS TAB PANEL */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                
                {/* PDF/CSV Report Generation banner */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-6 md:p-8 text-white border border-emerald-500/20 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10 space-y-4 max-w-xl">
                    <span className="inline-block bg-emerald-500/35 text-emerald-25 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-400/20">
                      Inventory & Accounting
                    </span>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight leading-none">
                      Export Audit Report Logs
                    </h3>
                    <p className="text-xs text-emerald-100/90 leading-relaxed font-semibold">
                      Compile a comprehensive breakdown of active catalogue values, stock levels, unit pricing, order totals, and customer shipment details. Export directly as a standard format `.csv` spreadsheet file.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={generateCsvReport}
                        className="rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 px-5 py-3.5 text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center space-x-2"
                      >
                        <span>📥</span>
                        <span>Download Audit CSV Report</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit summaries cards */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-3">
                    Audit Breakdown Summary
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-650 font-semibold leading-relaxed">
                    <div className="space-y-2">
                      <p className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Total Listed Products:</span>
                        <span className="text-slate-900 font-extrabold">{products.length} crops</span>
                      </p>
                      <p className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Total Registered Inventory Units:</span>
                        <span className="text-slate-900 font-extrabold">{products.reduce((sum, p) => sum + p.stock, 0)} units</span>
                      </p>
                      <p className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Average Product Listing Price:</span>
                        <span className="text-slate-900 font-extrabold">
                          {products.length > 0 
                            ? Math.round(products.reduce((sum, p) => sum + Number(p.price), 0) / products.length).toLocaleString() 
                            : 0} RWF
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Total Completed Sales Subtotal:</span>
                        <span className="text-emerald-600 font-black">{totalEarnings.toLocaleString()} RWF</span>
                      </p>
                      <p className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Total Items Shipped:</span>
                        <span className="text-slate-900 font-extrabold">
                          {sales.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + s.quantity, 0)} units
                        </span>
                      </p>
                      <p className="flex justify-between border-b border-slate-100 pb-2">
                        <span>Pending Customer Shipments:</span>
                        <span className="text-orange-600 font-black">
                          {sales.filter(s => s.status === 'pending').length} orders
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* ==========================================
          MODAL: ADD / EDIT CROP DIALOG
         ========================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                {editingProduct ? 'Edit Crop Details' : 'List New Crop'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">Provide agricultural product details below.</p>
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 p-4 border border-rose-100 text-center text-xs text-rose-800 font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label htmlFor="crop-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Crop Name
                </label>
                <input
                  id="crop-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Red Beans, Sweet Potatoes"
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="crop-price" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                    Price (RWF)
                  </label>
                  <input
                    id="crop-price"
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="crop-stock" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                    Stock Quantity
                  </label>
                  <input
                    id="crop-stock"
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="e.g. 100"
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="crop-category" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                    Category
                  </label>
                  <select
                    id="crop-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold"
                  >
                    <option value="Grains">Grains 🌾</option>
                    <option value="Vegetables">Vegetables 🥦</option>
                    <option value="Fruits">Fruits 🍎</option>
                    <option value="Tubers">Tubers 🥔</option>
                    <option value="Other">Other 🍃</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="crop-discount" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                    Discount (%)
                  </label>
                  <input
                    id="crop-discount"
                    type="number"
                    min="0"
                    max="50"
                    step="5"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="crop-image" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1 flex justify-between items-center">
                  <span>Image URL</span>
                  {imageUrl && <span className="text-[10px] text-emerald-600 font-extrabold uppercase">Live Preview</span>}
                </label>
                
                {imageUrl && (
                  <div className="mb-3 w-full h-40 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center relative">
                    <img
                      src={imageUrl}
                      alt="Crop image preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const placeholder = parent.querySelector('.preview-error-placeholder');
                          if (placeholder) placeholder.classList.remove('hidden');
                        }
                      }}
                    />
                    <div className="preview-error-placeholder hidden absolute inset-0 flex flex-col items-center justify-center bg-rose-50 text-rose-800 p-4 text-center space-y-1">
                      <span className="text-2xl">⚠️</span>
                      <span className="text-xs font-extrabold">Image Failed to Load</span>
                      <span className="text-[9px] text-rose-600 leading-normal font-semibold">Check if the URL is valid, complete, and contains the full query parameters.</span>
                    </div>
                  </div>
                )}

                <input
                  id="crop-image"
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold text-xs text-slate-600"
                />
              </div>

              <div>
                <label htmlFor="crop-description" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Description
                </label>
                <textarea
                  id="crop-description"
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell clients about crop quality, harvest date, location, etc."
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  {formLoading ? 'Saving...' : 'Save Crop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
