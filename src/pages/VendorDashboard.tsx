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
  
  // Dashboard navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'crops' | 'orders'>('overview');
  
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
      image_url: imageUrl || undefined
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

  return (
    <div className="min-h-[calc(100vh-62px)] bg-slate-50/50 pb-24 pt-4 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vendor Dashboard</h1>
            <p className="text-xs text-slate-500 font-semibold">Welcome back, Farmer {user?.name}</p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center space-x-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-xs font-bold shadow-lg shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
          >
            <span>🌾</span>
            <span>Add New Crop</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex space-x-2.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 mb-6">
          {(['overview', 'crops', 'orders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'overview' && '📈 Stats'}
              {tab === 'crops' && '🌾 My Catalogue'}
              {tab === 'orders' && `📦 Customer Orders (${sales.length})`}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100 text-center text-rose-800 mb-6">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* ==========================================
                TAB 1: OVERVIEW STATS
               ========================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Total Sales Earnings</span>
                    <span className="text-2xl font-black text-emerald-600">{totalEarnings.toLocaleString()} RWF</span>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Crops Listed</span>
                    <span className="text-2xl font-black text-slate-800">{activeListingsCount} crops</span>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Orders Received</span>
                    <span className="text-2xl font-black text-slate-800">{totalOrdersCount} orders</span>
                  </div>
                </div>

                {/* Recent Activity / Quick overview info */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 mb-4">Dashboard Quick Tips</h3>
                  <div className="space-y-3.5 text-xs text-slate-600 font-semibold leading-relaxed">
                    <div className="flex items-start space-x-2">
                      <span className="text-base">🚀</span>
                      <p>List new crops with detailed descriptions to get faster buyers.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-base">📦</span>
                      <p>Update order status immediately you ship products to customer addresses.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-base">🌱</span>
                      <p>Maintain precise stock levels so clients can order valid quantities without transaction cancellations.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                TAB 2: MY CROPS CATALOGUE (CRUD LIST)
               ========================================== */}
            {activeTab === 'crops' && (
              <div className="space-y-4">
                {products.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center">
                    <span className="text-5xl block mb-3">🌾</span>
                    <h3 className="text-base font-bold text-slate-700">No crops listed yet</h3>
                    <p className="text-xs text-slate-400">Click the Add New Crop button to start list products</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-100 p-4 sm:p-6">
                    {products.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center space-x-3.5">
                          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl font-bold">
                            {p.category === 'Grains' && '🌾'}
                            {p.category === 'Vegetables' && '🥦'}
                            {p.category === 'Fruits' && '🍎'}
                            {p.category === 'Tubers' && '🥔'}
                            {p.category !== 'Grains' && p.category !== 'Vegetables' && p.category !== 'Fruits' && p.category !== 'Tubers' && '🍃'}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 leading-snug">{p.name}</h3>
                            <div className="flex space-x-2 text-[10px] text-slate-400 font-semibold mt-1">
                              <span>Price: {p.price.toLocaleString()} RWF</span>
                              <span>•</span>
                              <span className={p.stock < 5 ? 'text-rose-600 font-bold' : ''}>Stock: {p.stock} units</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-100 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-100 transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==========================================
                TAB 3: CUSTOMER ORDERS LIST
               ========================================== */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {sales.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center">
                    <span className="text-5xl block mb-3">📦</span>
                    <h3 className="text-base font-bold text-slate-700">No orders received yet</h3>
                    <p className="text-xs text-slate-400">Orders placed by customers for your crops will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3.5"
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Order ID</span>
                            <span className="text-xs font-black text-slate-800">#{sale.order_id}</span>
                          </div>
                          
                          {/* Status Badge */}
                          <span
                            className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${
                              sale.status === 'delivered'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : sale.status === 'shipped'
                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                : sale.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : 'bg-orange-50 text-orange-600 border border-orange-100'
                            }`}
                          >
                            {sale.status}
                          </span>
                        </div>

                        {/* Order info */}
                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Crop Ordered</span>
                            <span className="text-slate-900">{sale.product_name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Quantity</span>
                            <span className="text-slate-900">{sale.quantity} units</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Earnings Subtotal</span>
                            <span className="text-emerald-600 font-bold">{(Number(sale.price) * sale.quantity).toLocaleString()} RWF</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Order Date</span>
                            <span className="text-slate-900">{new Date(sale.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Customer Address & Phone */}
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs font-semibold text-slate-600">
                          <p className="truncate"><span className="text-slate-400">Buyer:</span> {sale.buyer_name} ({sale.buyer_email})</p>
                          <p className="mt-1"><span className="text-slate-400">Phone:</span> {sale.phone}</p>
                          <p className="mt-1 truncate"><span className="text-slate-400">Address:</span> {sale.shipping_address}</p>
                        </div>

                        {/* Order Actions */}
                        {sale.status !== 'delivered' && sale.status !== 'cancelled' && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleUpdateOrderStatus(sale.order_id, sale.status)}
                              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-all cursor-pointer"
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
          </>
        )}

      </div>

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
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
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
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
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
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="crop-category" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
                  Category
                </label>
                <select
                  id="crop-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
                >
                  <option value="Grains">Grains 🌾</option>
                  <option value="Vegetables">Vegetables 🥦</option>
                  <option value="Fruits">Fruits 🍎</option>
                  <option value="Tubers">Tubers 🥔</option>
                  <option value="Other">Other 🍃</option>
                </select>
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
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm"
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
