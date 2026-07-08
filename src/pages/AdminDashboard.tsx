import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'buyer' | 'vendor' | 'admin';
  vendor_status?: string;
  tin_number?: string;
  rdb_certificate?: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_email?: string;
  is_approved?: boolean;
  created_at: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string;
  image_url?: string;
}

interface Order {
  id: number;
  buyer_id: number;
  buyer_name: string;
  buyer_email: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: string;
  phone: string;
  created_at: string;
  items: OrderItem[];
}

interface EmailLog {
  timestamp: string;
  type: string;
  email: string;
  error?: string;
  code?: string;
  stack?: string;
}

interface DiagnosticLogs {
  smtp_configured: boolean;
  smtp_user: string;
  logs: EmailLog[];
}

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'orders' | 'payouts' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [diagLogs, setDiagLogs] = useState<DiagnosticLogs | null>(null);

  // Onboarding, Crop Approvals & Payouts States
  const [payoutsSummary, setPayoutsSummary] = useState<any[]>([]);
  const [payoutsHistory, setPayoutsHistory] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedRdbData, setSelectedRdbData] = useState<{ name: string; doc: string } | null>(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Stats
      const statsRes = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers });
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Users
      const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, { headers });
      if (usersRes.ok) setUsers(await usersRes.json());

      // 3. Products
      const productsRes = await fetch(`${API_BASE_URL}/api/admin/products`, { headers });
      if (productsRes.ok) setProducts(await productsRes.json());

      // 4. Orders
      const ordersRes = await fetch(`${API_BASE_URL}/api/admin/orders`, { headers });
      if (ordersRes.ok) setOrders(await ordersRes.json());

      // 5. Diagnostics Email Logs
      const logsRes = await fetch(`${API_BASE_URL}/api/auth/email-logs`);
      if (logsRes.ok) setDiagLogs(await logsRes.json());

      // 6. Payouts Ledger Summary
      const payoutsSummaryRes = await fetch(`${API_BASE_URL}/api/admin/payouts/summary`, { headers });
      if (payoutsSummaryRes.ok) setPayoutsSummary(await payoutsSummaryRes.json());

      // 7. Payouts History Logs
      const payoutsHistoryRes = await fetch(`${API_BASE_URL}/api/admin/payouts`, { headers });
      if (payoutsHistoryRes.ok) setPayoutsHistory(await payoutsHistoryRes.json());

    } catch (err) {
      console.error(err);
      showToast('Ntabwo hashoboye kubonwa amakuru yose (Failed to load admin resources)', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Onboarding, Crop Approvals & Payouts Action Handlers
  const handleUpdateVendorStatus = async (userId: number, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/vendor-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Seller status updated to ${status} successfully!`, 'success');
        fetchData();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to update seller status.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error updating seller status.', 'error');
    }
  };

  const handleApproveProduct = async (productId: number, approve: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/products/${productId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approve })
      });
      if (res.ok) {
        showToast(approve ? 'Crop listing approved successfully!' : 'Crop listing status updated.', 'success');
        fetchData();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to approve product.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error updating crop approval.', 'error');
    }
  };

  const handleRecordPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !payoutAmount || parseFloat(payoutAmount) <= 0) {
      showToast('Please provide a valid payout amount.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendor_id: selectedVendorId,
          amount: parseFloat(payoutAmount)
        })
      });

      if (res.ok) {
        showToast('Farmer payout recorded successfully!', 'success');
        setPayoutAmount('');
        setPayoutModalOpen(false);
        fetchData();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to record payout.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error recording payout.', 'error');
    }
  };

  // User Actions
  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role');
      showToast('Uruhare rw\'umukoresha rwahinduwe! (User role updated successfully)', 'success');
      fetchData(); // Refresh UI
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Ese urashaka gusiba uyu mukoresha "${userName}" burundu?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      showToast('Umukoresha yasibwe neza! (User deleted successfully)', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Product Actions
  const handleDeleteProduct = async (prodId: number, prodName: string) => {
    if (!window.confirm(`Ese urashaka gusiba iki gicuruzwa "${prodName}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/products/${prodId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');
      showToast('Igicuruzwa cyasibwe! (Product deleted successfully)', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Order Actions
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order status');
      showToast('Imiterere y\'ibwatumijwe yahinduwe! (Order status updated)', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          (p.vendor_name && p.vendor_name.toLowerCase().includes(productSearch.toLowerCase()));
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500">Iri gufunguka... (Loading admin dashboard resources)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white px-6 py-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="bg-red-500 text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest animate-pulse">
                Secure Session
              </span>
              <span className="text-xs text-emerald-350 font-bold">Admin Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-semibold">
              Manage system metrics, verify registered farmers, moderate active crops, and inspect operational logs.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right shrink-0">
            <p className="text-[10px] text-emerald-250 uppercase font-black tracking-wider">Logged in Administrator</p>
            <p className="text-sm font-bold mt-0.5">{user?.name}</p>
            <p className="text-xs text-white/70 font-semibold">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* 2. Responsive Tabs Layout */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>📊</span>
            <span>System Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-2 ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>👥</span>
            <span>User Management ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-2 ${
              activeTab === 'products'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>🥦</span>
            <span>Crop Moderation ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-2 ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>📦</span>
            <span>Orders Tracked ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-2 ${
              activeTab === 'payouts'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>💸</span>
            <span>Payouts & Earnings</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-2 ${
              activeTab === 'logs'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>🛡️</span>
            <span>Diagnostics Logs</span>
          </button>
        </div>

        {/* 3. Tab Contents */}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-fadeIn">
            {/* Pending actions alerts banner */}
            {(users.filter(u => u.role === 'vendor' && u.vendor_status === 'pending').length > 0 || products.filter(p => !p.is_approved).length > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-amber-850">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <span className="block font-black text-slate-800">Pending Actions Required</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {users.filter(u => u.role === 'vendor' && u.vendor_status === 'pending').length} sellers are waiting for onboarding review & {products.filter(p => !p.is_approved).length} crops are waiting for approval.
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {users.filter(u => u.role === 'vendor' && u.vendor_status === 'pending').length > 0 && (
                    <button onClick={() => setActiveTab('users')} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg border-none text-[10px] uppercase font-black tracking-wider cursor-pointer">
                      Verify Sellers
                    </button>
                  )}
                  {products.filter(p => !p.is_approved).length > 0 && (
                    <button onClick={() => setActiveTab('products')} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg border-none text-[10px] uppercase font-black tracking-wider cursor-pointer">
                      Moderate Crops
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  💰
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Platform Revenue</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{stats.revenue.toLocaleString()} RWF</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">
                  👥
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Platform Users</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{stats.users.total} accounts</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-lg">
                  🥦
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Crops Listed</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{stats.products} products</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-lg">
                  📦
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Orders Placed</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{stats.orders} orders</p>
                </div>
              </div>
            </div>

            {/* Breakdown & Recent Activity tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* User Breakdown */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider mb-4">User Type Breakdown</h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-600">Buyers / Customers</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded">
                      {stats.users.buyers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-600">Sellers / Farmers</span>
                    <span className="bg-orange-100 text-orange-850 text-[10px] font-black px-2 py-0.5 rounded">
                      {stats.users.vendors}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-600">System Administrators</span>
                    <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded">
                      {stats.users.admins}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Orders table */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider mb-4">Recent Platform Orders</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                        <th className="pb-3">Order ID</th>
                        <th className="pb-3">Buyer Name</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {stats.recentOrders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-bold text-slate-900">#{o.id}</td>
                          <td className="py-3">{o.buyer_name || 'Anonymous'}</td>
                          <td className="py-3">{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                              o.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                              o.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-right font-black text-emerald-600">
                            {Number(o.total_amount).toLocaleString()} RWF
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-fadeIn">
            {/* Filters panel */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full sm:max-w-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-650 bg-white"
              >
                <option value="all">Filter by Role (All)</option>
                <option value="buyer">Buyers</option>
                <option value="vendor">Sellers / Farmers</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 text-[10px] uppercase font-black text-slate-450 tracking-wider">
                    <th className="pb-3.5 pl-2">User ID</th>
                    <th className="pb-3.5">Name</th>
                    <th className="pb-3.5">Email</th>
                    <th className="pb-3.5">Current Role</th>
                    <th className="pb-3.5">Onboarding Status</th>
                    <th className="pb-3.5">Credentials (TIN/RDB)</th>
                    <th className="pb-3.5">Registered Date</th>
                    <th className="pb-3.5 text-center">Change Role</th>
                    <th className="pb-3.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 font-bold">
                        No users found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-4 pl-2 font-bold text-slate-900">#{u.id}</td>
                        <td className="py-4">{u.name}</td>
                        <td className="py-4 font-mono text-slate-600 text-[11px]">{u.email}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            u.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                            u.role === 'vendor' ? 'bg-orange-100 text-orange-850' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {u.role === 'admin' ? 'Admin' : u.role === 'vendor' ? 'Farmer' : 'Buyer'}
                          </span>
                        </td>
                        <td className="py-4">
                          {u.role === 'vendor' ? (
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              u.vendor_status === 'approved' ? 'bg-emerald-100 text-emerald-850' :
                              u.vendor_status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-850'
                            }`}>
                              {u.vendor_status}
                            </span>
                          ) : (
                            <span className="text-slate-350">—</span>
                          )}
                        </td>
                        <td className="py-4">
                          {u.role === 'vendor' ? (
                            <div className="space-y-1">
                              {u.tin_number ? (
                                <span className="block text-[10px] text-slate-700">TIN: <span className="font-mono font-bold text-slate-900">{u.tin_number}</span></span>
                              ) : (
                                <span className="block text-[9px] text-rose-500 font-bold">No TIN Number</span>
                              )}
                              {u.rdb_certificate ? (
                                <button
                                  onClick={() => setSelectedRdbData({ name: u.name, doc: u.rdb_certificate || '' })}
                                  className="block text-[9px] font-black text-emerald-600 hover:underline bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-100 cursor-pointer border-none"
                                >
                                  📄 View Certificate
                                </button>
                              ) : (
                                <span className="block text-[9px] text-rose-500 font-bold">No RDB Cert</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-350">—</span>
                          )}
                        </td>
                        <td className="py-4 text-slate-400 font-medium">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-4 text-center">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="text-[10px] font-black rounded-lg border border-slate-200 px-2 py-1 bg-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="buyer">Make Buyer</option>
                            <option value="vendor">Make Farmer / Seller</option>
                            <option value="admin">Make Administrator</option>
                          </select>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end space-x-1.5">
                            {u.role === 'vendor' && u.vendor_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateVendorStatus(u.id, 'approved')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer border-none"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateVendorStatus(u.id, 'rejected')}
                                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer border-none"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              disabled={u.id === user?.id}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg p-1.5 transition-all text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-rose-100"
                              title="Delete user"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCT MODERATION */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-fadeIn">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="Search by crop name or vendor..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full sm:max-w-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-650 bg-white"
              >
                <option value="all">Filter by Category (All)</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
                <option value="Tubers">Tubers</option>
                <option value="Livestock">Livestock</option>
              </select>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 text-[10px] uppercase font-black text-slate-450 tracking-wider">
                    <th className="pb-3.5 pl-2">ID</th>
                    <th className="pb-3.5">Crop Details</th>
                    <th className="pb-3.5">Category</th>
                    <th className="pb-3.5">Vendor / Farmer Details</th>
                    <th className="pb-3.5 text-right">Price</th>
                    <th className="pb-3.5 text-center">In Stock</th>
                    <th className="pb-3.5 text-center">Approval Status</th>
                    <th className="pb-3.5 text-right pr-2">Moderate Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 font-bold">
                        No products listed matching current search query.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-4 pl-2 font-bold text-slate-900">#{p.id}</td>
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl shrink-0">
                              {p.category === 'Vegetables' ? '🥦' : p.category === 'Grains' ? '🌾' : p.category === 'Fruits' ? '🍎' : '🥔'}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 truncate max-w-[150px]">{p.name}</h4>
                              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-slate-500">{p.category}</td>
                        <td className="py-4">
                          <div className="text-xs">
                            <p className="font-bold text-slate-900">{p.vendor_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{p.vendor_email}</p>
                          </div>
                        </td>
                        <td className="py-4 text-right font-black text-slate-900">{Number(p.price).toLocaleString()} RWF</td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-0.5 rounded font-black ${
                            p.stock <= 0 ? 'bg-red-50 text-red-655' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            p.is_approved ? 'bg-emerald-100 text-emerald-850' : 'bg-amber-100 text-amber-850'
                          }`}>
                            {p.is_approved ? 'Approved' : 'Pending Approval'}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end space-x-1.5">
                            {!p.is_approved && (
                              <button
                                onClick={() => handleApproveProduct(p.id, true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer border-none"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg p-1.5 transition-all text-xs cursor-pointer font-bold border border-rose-100"
                              title="Delete Crop"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ORDER TRACKING */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-fadeIn">
            {/* Filter */}
            <div className="flex justify-between items-center mb-6">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-650 bg-white"
              >
                <option value="all">Filter by Order Status (All)</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 text-[10px] uppercase font-black text-slate-450 tracking-wider">
                    <th className="pb-3.5 pl-2">Order ID</th>
                    <th className="pb-3.5">Buyer</th>
                    <th className="pb-3.5">Delivery Address & Phone</th>
                    <th className="pb-3.5">Ordered Crops / Quantities</th>
                    <th className="pb-3.5 text-right">Order Total</th>
                    <th className="pb-3.5 text-center">Status Action</th>
                    <th className="pb-3.5">Date Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-bold">
                        No orders recorded matching filter status.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="py-4 pl-2 font-bold text-slate-900">#{o.id}</td>
                        <td className="py-4">
                          <div className="text-xs">
                            <p className="font-bold text-slate-900">{o.buyer_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{o.buyer_email}</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="font-semibold truncate max-w-[150px]">{o.shipping_address}</p>
                          <p className="text-[10px] text-slate-450 font-bold font-mono">{o.phone}</p>
                        </td>
                        <td className="py-4">
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                            {o.items.map((item) => (
                              <li key={item.id}>
                                <span className="font-bold text-slate-900">{item.product_name}</span> (x{item.quantity})
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-4 text-right font-black text-emerald-700">{Number(o.total_amount).toLocaleString()} RWF</td>
                        <td className="py-4 text-center">
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            className={`text-[10px] font-black rounded-lg border px-2.5 py-1 focus:outline-none bg-white ${
                              o.status === 'delivered' ? 'border-emerald-500 text-emerald-800' :
                              o.status === 'cancelled' ? 'border-red-500 text-red-800' :
                              o.status === 'shipped' ? 'border-blue-500 text-blue-800' :
                              'border-amber-500 text-amber-800'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-4 text-slate-400 font-medium">{new Date(o.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PAYOUTS & EARNINGS MANAGEMENT */}
        {activeTab === 'payouts' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top overview of unpaid balances / pending payouts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  💸
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Farm Sales (Delivered)</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {payoutsSummary.reduce((sum, s) => sum + s.gross_sales, 0).toLocaleString()} RWF
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-lg">
                  🤝
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Payouts Disbursed</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {payoutsSummary.reduce((sum, s) => sum + s.total_paid, 0).toLocaleString()} RWF
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-lg">
                  ⏳
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Farmer Balance</p>
                  <p className="text-lg font-black text-amber-750 mt-0.5">
                    {payoutsSummary.reduce((sum, s) => sum + s.balance, 0).toLocaleString()} RWF
                  </p>
                </div>
              </div>
            </div>

            {/* Payouts Ledger Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider mb-4">Farmer Earnings Ledger</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-black text-slate-450 tracking-wider">
                      <th className="pb-3 pl-2">Farmer ID</th>
                      <th className="pb-3">Farmer Name</th>
                      <th className="pb-3">Farmer Email</th>
                      <th className="pb-3 text-right">Gross Sales</th>
                      <th className="pb-3 text-right">Total Paid</th>
                      <th className="pb-3 text-right">Remaining Balance</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutsSummary.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-bold">
                          No farmers found in system.
                        </td>
                      </tr>
                    ) : (
                      payoutsSummary.map((s) => (
                        <tr key={s.vendor_id} className="hover:bg-slate-50/50">
                          <td className="py-4 pl-2 font-bold text-slate-900">#{s.vendor_id}</td>
                          <td className="py-4 font-extrabold">{s.vendor_name}</td>
                          <td className="py-4 font-mono text-slate-500 text-[11px]">{s.vendor_email}</td>
                          <td className="py-4 text-right font-bold text-slate-900">{s.gross_sales.toLocaleString()} RWF</td>
                          <td className="py-4 text-right text-emerald-600 font-bold">{s.total_paid.toLocaleString()} RWF</td>
                          <td className="py-4 text-right font-black text-amber-700">{s.balance.toLocaleString()} RWF</td>
                          <td className="py-4 text-right pr-2">
                            <button
                              onClick={() => {
                                setSelectedVendorId(s.vendor_id);
                                setPayoutModalOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer border-none"
                            >
                              💸 Record Payout
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payouts History Logs */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider mb-4">Payout Transaction Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-black text-slate-455 tracking-wider">
                      <th className="pb-3 pl-2">Payout ID</th>
                      <th className="pb-3">Farmer Details</th>
                      <th className="pb-3 text-right">Amount Disbursed</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right pr-2">Date Cleared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 font-bold">
                          No payout transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payoutsHistory.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="py-4 pl-2 font-bold text-slate-900">#{p.id}</td>
                          <td className="py-4">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-slate-900 block">{p.vendor_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.vendor_email}</span>
                            </div>
                          </td>
                          <td className="py-4 text-right font-black text-emerald-600">{Number(p.amount).toLocaleString()} RWF</td>
                          <td className="py-4 text-center">
                            <span className="bg-emerald-100 text-emerald-850 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2 text-slate-400 font-medium">{new Date(p.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM DIAGNOSTICS & LOGS */}
        {activeTab === 'logs' && diagLogs && (
          <div className="space-y-6 animate-fadeIn">
            {/* System settings card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider mb-4">SMTP Configuration Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                  <p className="text-slate-450">Active Email Delivery Host</p>
                  <p className="text-sm font-black text-slate-800">
                    {diagLogs.smtp_configured ? 'Brevo API / SMTP Server Relay' : 'Sandboxed Local Console Mock'}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                  <p className="text-slate-450">Sender Account</p>
                  <p className="text-sm font-mono text-slate-800 break-all">{diagLogs.smtp_user}</p>
                </div>
              </div>
            </div>

            {/* Email Dispatch Logs Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Email Delivery Logs</h3>
                <button
                  onClick={fetchData}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none"
                >
                  🔄 Refresh Logs
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-250 text-[10px] uppercase font-black text-slate-455 tracking-wider">
                      <th className="pb-3.5 pl-2">Time</th>
                      <th className="pb-3.5">Log Type</th>
                      <th className="pb-3.5">Target Address</th>
                      <th className="pb-3.5">Delivery Status</th>
                      <th className="pb-3.5 pr-2">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {diagLogs.logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 font-bold">
                          No background logs recorded yet. All emails sent successfully or no activity.
                        </td>
                      </tr>
                    ) : (
                      diagLogs.logs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 pl-2 font-mono text-[10px] text-slate-550">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-slate-900">{log.type}</span>
                          </td>
                          <td className="py-3 font-mono text-[11px]">{log.email}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              log.error ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {log.error ? 'Failed' : 'Success'}
                            </span>
                          </td>
                          <td className="py-3 pr-2 font-mono text-[10px] text-rose-600 max-w-[200px] truncate" title={log.error}>
                            {log.error || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* RDB CERTIFICATE PREVIEW MODAL */}
      {selectedRdbData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-100 shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setSelectedRdbData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 text-xl font-bold bg-transparent border-none cursor-pointer"
            >
              ✕
            </button>
            <div className="mb-4">
              <h3 className="text-base font-black text-slate-900">RDB Certificate Preview</h3>
              <p className="text-xs text-slate-450 font-bold mt-0.5">Application submitted by {selectedRdbData.name}</p>
            </div>
            <div className="flex-1 bg-slate-100 rounded-2xl overflow-y-auto p-2 border border-slate-200 min-h-[300px] flex items-center justify-center">
              {selectedRdbData.doc.startsWith('data:image/') ? (
                <img
                  src={selectedRdbData.doc}
                  alt="RDB Certificate"
                  className="max-w-full max-h-[60vh] rounded-xl object-contain shadow"
                />
              ) : selectedRdbData.doc.startsWith('data:application/pdf') || selectedRdbData.doc.startsWith('data:application/octet-stream') ? (
                <iframe
                  src={selectedRdbData.doc}
                  title="RDB PDF Viewer"
                  className="w-full h-[55vh] rounded-xl"
                />
              ) : (
                <div className="text-center p-6 space-y-4">
                  <span className="text-3xl block">📋</span>
                  <p className="text-xs text-slate-650 font-semibold max-w-sm mx-auto">
                    The document content does not support inline rendering. Click the button below to download the certificate string directly.
                  </p>
                  <a
                    href={selectedRdbData.doc}
                    download={`RDB_Certificate_${selectedRdbData.name.replace(/\s+/g, '_')}`}
                    className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-md tracking-wider uppercase cursor-pointer"
                  >
                    Download Certificate Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYOUT FORM MODAL */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4">
          <form
            onSubmit={handleRecordPayoutSubmit}
            className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 relative space-y-5"
          >
            <button
              type="button"
              onClick={() => setPayoutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 text-xl font-bold bg-transparent border-none cursor-pointer"
            >
              ✕
            </button>
            <div>
              <h3 className="text-base font-black text-slate-900">Record Farmer Payout</h3>
              <p className="text-xs text-slate-455 font-bold mt-0.5">
                Register a new payout disbursement for Vendor #{selectedVendorId}
              </p>
            </div>
            <div>
              <label htmlFor="payout-amount" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Payout Amount (RWF)
              </label>
              <input
                id="payout-amount"
                type="number"
                required
                min="1"
                placeholder="Enter payout amount..."
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="block w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-sm font-semibold"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-xs font-bold cursor-pointer border-none transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-xs font-bold shadow-md cursor-pointer border-none transition-all active:scale-[0.98]"
              >
                Disburse Payout
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
