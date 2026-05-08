import { useEffect, useState } from 'react';
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
  ChevronRight
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL;

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
        const res = await fetch(
          `${BASE}/api/dashboard?year=${selectedYear}`,
          {
            method: "GET",
            credentials: "include"
          }
        );
        const data = await res.json();
        if (data.success) {
          setDashboardData({
            stats: data.stats || {},
            chartData: data.chartData || [],
            topCities: data.topCities || [],
            totalCost: data.totalCost || 0
          });
          // Reset to page 1 whenever year changes
          setCurrentPage(1);
        }
      } catch (error) {
        console.error(error);
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

  const stats = [
    {
      label: 'Total Orders',
      value: dashboardData.stats.totalOrders || 0,
      icon: <Package className="text-blue-600" />,
      color: 'bg-blue-50'
    },
    {
      label: 'Orders Delivered',
      value: dashboardData.stats.deliveredOrders || 0,
      icon: <CheckCircle2 className="text-green-600" />,
      trend: `${dashboardData.stats.deliveredOrders || 0}`,
      color: 'bg-green-50'
    },
    {
      label: 'In Transit',
      value: dashboardData.stats.inTransitOrders || 0,
      icon: <Truck className="text-orange-600" />,
      trend: `${dashboardData.stats.inTransitOrders || 0}`,
      color: 'bg-orange-50'
    },
    {
      label: 'Delayed',
      value: dashboardData.stats.delayedOrders || 0,
      icon: <AlertCircle className="text-red-600" />,
      trend: `${dashboardData.stats.delayedOrders || 0}`,
      color: 'bg-red-50'
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700">
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Metric Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:scale-[1.02]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* Annual Performance Histogram */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-500" />
                Annual Performance
              </h2>
              <p className="text-xs text-slate-400 font-medium">Data overview for the year {selectedYear}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="2026">FY 2026</option>
                  <option value="2025">FY 2025</option>
                  <option value="2024">FY 2024</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
               <div className="hidden lg:flex gap-4 text-[10px] font-bold uppercase tracking-widest">

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
          </div>

          <div className="flex items-end justify-between h-72 border-b border-slate-100 pb-2 gap-1 overflow-x-auto lg:overflow-visible">
            {dashboardData.chartData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center group flex-1 min-w-11.25">
                <div className="flex items-end gap-0.5 mb-3">
                  <div
                    style={{ height: `${Math.max(item.orders * 2, 20)}px` }}
                    className="w-3 md:w-4 bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600 relative"
                  >
                    <span className="absolute -top-8 left-[20%] -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[9px] py-1 px-2 rounded z-10">
                      {item.orders}
                    </span>
                  </div>
                  <div
                    style={{ height: `${Math.max(item.cost / 100, 20)}px` }}
                    className="w-3 md:w-4 bg-orange-400 rounded-t-sm transition-all group-hover:bg-orange-500 relative"
                  >
                    <span className="absolute -top-8 left-[80%] -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[9px] py-1 px-2 rounded z-10">
                      ₹{item.cost}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={18} className="text-blue-500" />
                Top Destination Cities
              </h2>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-600 px-2">
                  {currentPage} <span className="text-slate-400 font-medium">/ {totalPages || 1}</span>
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto min-h-90 flex flex-col justify-between">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4 text-center">Total Orders</th>
                    <th className="px-6 py-4 text-right">Courier Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentCities.map((data, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all cursor-default">
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
              
              {/* Empty state padding to keep height consistent */}
              {currentCities.length === 0 && !loading && (
                 <div className="p-12 text-center text-slate-400 text-sm">No city data available.</div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1 bg-[#0F172A] text-white rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center min-h-50">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
            <TrendingUp size={20} className="text-orange-400 mb-4" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Summary {selectedYear}</h3>
            <div className="text-3xl font-black mt-2 tracking-tight">
              ₹{Number(dashboardData.totalCost || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500 mt-4 leading-relaxed italic">
              Total shipping expenditure for the selected fiscal cycle.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;