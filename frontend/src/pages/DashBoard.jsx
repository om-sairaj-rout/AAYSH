import { useEffect, useState } from 'react';
import { getDashboardData } from '../api/dashboardAPI';
import {
  BarChart3,
  Package,
  Truck,
  AlertCircle,
  CheckCircle2,
  MapPin,
  TrendingUp,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  RotateCcw,
  Clock,
  BookmarkCheck,
  Send,
  ShieldAlert,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    chartData: [],
    topCities: [],
    totalCost: 0
  });

  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const citiesPerPage = 5;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await getDashboardData(selectedYear);

        setDashboardData({
          stats: data.stats || {},
          chartData: data.chartData || [],
          topCities: data.topCities || [],
          totalCost: data.totalCost || 0,
        });

        setCurrentPage(1);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedYear]);

  // Pagination Logic
  const indexOfLastCity = currentPage * citiesPerPage;
  const indexOfFirstCity = indexOfLastCity - citiesPerPage;
  const currentCities = dashboardData.topCities.slice(indexOfFirstCity, indexOfLastCity);
  const totalPages = Math.ceil(dashboardData.topCities.length / citiesPerPage);

  const totalOrders = dashboardData.stats.totalOrders || 0;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700">
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* ================= PAGE HEADER WITH IMPROVED YEAR SELECTOR ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Real-time logistics, performance analytics, and shipment tracking</p>
          </div>

          {/* Premium Top-Right Fiscal Year Filter Control */}
          <div className="relative self-start sm:self-auto group">
            <div className="flex items-center gap-2.5 bg-white pl-3.5 pr-9 py-2 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <CalendarDays size={16} className="shrink-0" />
              </div>
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider select-none">
                Fiscal Year:
              </span>
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                FY {selectedYear}
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-sm font-bold"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year} className="bg-white text-slate-800 py-2 font-semibold">
                    Fiscal Year {year}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-600 transition-colors pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ================= COMPACT SEGMENTED STATUS COMMAND BAR ================= */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs mb-8">
          
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Shipment Status Overview</h3>
                <p className="text-xs font-medium text-slate-400">Live breakdown of active orders across lifecycle states</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Package size={16} className="text-blue-500" />
              <span>Total Volume: <strong className="text-slate-900 text-base">{totalOrders}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Section 1: Order Booking Stage */}
            <div className="lg:col-span-3 bg-slate-50/80 p-4.5 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookmarkCheck size={14} className="text-indigo-500" /> Booking Stage
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <Clock size={14} className="text-amber-500" /> Pending
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.pendingOrders || 0}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <BookmarkCheck size={14} className="text-indigo-500" /> Booked
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.bookedOrders || 0}</p>
                </div>
              </div>
            </div>

            {/* Section 2: Active Fulfillment Stage */}
            <div className="lg:col-span-5 bg-slate-50/80 p-4.5 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Truck size={14} className="text-blue-500" /> Transit & Fulfillment
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <Send size={14} className="text-sky-500" /> Shipped
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.shippedOrders || 0}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <Truck size={14} className="text-orange-500" /> In Transit
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.inTransitOrders || 0}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <CheckCircle2 size={14} className="text-emerald-500" /> Delivered
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.deliveredOrders || 0}</p>
                </div>
              </div>
            </div>

            {/* Section 3: Issues & Returns Stage */}
            <div className="lg:col-span-4 bg-slate-50/80 p-4.5 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-rose-500" /> Exception Monitoring
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <AlertCircle size={14} className="text-amber-500" /> Delayed
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.delayedOrders || 0}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <XCircle size={14} className="text-rose-500" /> Cancelled
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.cancelledOrders || 0}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                    <RotateCcw size={14} className="text-red-500" /> RTO
                  </div>
                  <p className="text-2xl font-black text-slate-800">{dashboardData.stats.rtoOrders || 0}</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Annual Performance Histogram */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={22} className="text-blue-500" />
                Annual Performance
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Data overview for the year {selectedYear}</p>
            </div>

            {/* Chart Legend Badges */}
            <div className="flex gap-6 text-xs font-bold uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                Orders
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                Cost
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between h-72 border-b border-slate-100 pb-2 gap-1 overflow-x-auto lg:overflow-visible">
            {dashboardData.chartData.map((item, idx) => {
              const maxOrdersVal = Math.max(...dashboardData.chartData.map(d => d.orders || 0), 1);
              const maxCostVal = Math.max(...dashboardData.chartData.map(d => d.cost || 0), 1);

              const orderBarHeight = Math.max((item.orders / maxOrdersVal) * 140, 16); 
              const costBarHeight = Math.max((item.cost / maxCostVal) * 230, 16);

              return (
                <div key={idx} className="flex flex-col items-center group flex-1 min-w-11.25">
                  <div className="flex items-end gap-0.5 mb-3">
                    
                    {/* Orders Bar */}
                    <div
                      style={{ height: `${orderBarHeight}px` }}
                      className="w-3 md:w-4 bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600 relative"
                    >
                      <span className="absolute -top-8 left-[20%] -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] py-1 px-2 rounded z-10 whitespace-nowrap">
                        {item.orders}
                      </span>
                    </div>

                    {/* Cost Bar */}
                    <div
                      style={{ height: `${costBarHeight}px` }}
                      className="w-3 md:w-4 bg-orange-400 rounded-t-sm transition-all group-hover:bg-orange-500 relative"
                    >
                      <span className="absolute -top-8 left-[80%] -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] py-1 px-2 rounded z-10 whitespace-nowrap">
                        ₹{item.cost}
                      </span>
                    </div>

                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={20} className="text-blue-500" />
                Top Destination Cities
              </h2>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-600 px-2">
                  {currentPage} <span className="text-slate-400 font-medium">/ {totalPages || 1}</span>
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto min-h-90 flex flex-col justify-between">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4 text-center">Total Orders</th>
                    <th className="px-6 py-4 text-right">Courier Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentCities.map((data, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all cursor-default text-sm">
                      <td className="px-6 py-4 font-bold text-slate-700">{data.city}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                          {data.orders}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(data.cost || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Empty state padding */}
              {currentCities.length === 0 && !loading && (
                 <div className="p-12 text-center text-slate-400 text-sm">No city data available.</div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1 bg-[#0F172A] text-white rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center min-h-50">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
            <TrendingUp size={22} className="text-orange-400 mb-4" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Summary {selectedYear}</h3>
            <div className="text-3xl font-black mt-2 tracking-tight">
              ₹{Number(dashboardData.totalCost || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed italic">
              Total shipping expenditure for the selected fiscal cycle.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;