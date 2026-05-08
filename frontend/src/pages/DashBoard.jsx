import React, { useState } from 'react';
import { 
  BarChart3, Package, Truck, AlertCircle, CheckCircle2, 
  MapPin, TrendingUp, CalendarDays, ChevronDown 
} from 'lucide-react';

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState("2026");

  const allYearsData = {
    "2026": [
      { name: 'Jan', orders: 180, cost: 4000, hO: 'h-20', hC: 'h-12' },
      { name: 'Feb', orders: 220, cost: 5200, hO: 'h-24', hC: 'h-16' },
      { name: 'Mar', orders: 310, cost: 7800, hO: 'h-32', hC: 'h-24' },
      { name: 'Apr', orders: 400, cost: 9500, hO: 'h-40', hC: 'h-30' },
      { name: 'May', orders: 450, cost: 12400, hO: 'h-48', hC: 'h-36' },
      { name: 'Jun', orders: 380, cost: 8900, hO: 'h-40', hC: 'h-28' },
      { name: 'Jul', orders: 320, cost: 7200, hO: 'h-32', hC: 'h-24' },
      { name: 'Aug', orders: 290, cost: 6800, hO: 'h-28', hC: 'h-20' },
      { name: 'Sep', orders: 350, cost: 8100, hO: 'h-36', hC: 'h-26' },
      { name: 'Oct', orders: 420, cost: 11000, hO: 'h-44', hC: 'h-34' },
      { name: 'Nov', orders: 480, cost: 13500, hO: 'h-52', hC: 'h-40' },
      { name: 'Dec', orders: 500, cost: 15000, hO: 'h-56', hC: 'h-44' },
    ],
    "2025": [
      { name: 'Jan', orders: 150, cost: 3500, hO: 'h-16', hC: 'h-10' },
      { name: 'Dec', orders: 550, cost: 16000, hO: 'h-60', hC: 'h-48' },
    ],
    "2024": [
        { name: 'Jan', orders: 100, cost: 2000, hO: 'h-10', hC: 'h-6' },
        { name: 'Dec', orders: 400, cost: 12000, hO: 'h-40', hC: 'h-32' },
    ]
  };

  const stats = [
    { label: 'Total Orders', value: '1,284', icon: <Package className="text-blue-600" />, color: 'bg-blue-50' },
    { label: 'Orders Delivered', value: '842', icon: <CheckCircle2 className="text-green-600" />, trend: '65%', color: 'bg-green-50' },
    { label: 'In Transit', value: '312', icon: <Truck className="text-orange-600" />, trend: '24%', color: 'bg-orange-50' },
    { label: 'Delayed', value: '130', icon: <AlertCircle className="text-red-600" />, trend: '11%', color: 'bg-red-50' },
  ];

  const cityData = [
    { city: 'Mumbai', orders: 450, cost: '₹12,400' },
    { city: 'Delhi', orders: 320, cost: '₹9,800' },
    { city: 'Bangalore', orders: 280, cost: '₹11,200' },
    { city: 'Noida', orders: 150, cost: '₹4,500' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-700">
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Metric Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>{stat.icon}</div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.trend}</span>
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
                <BarChart3 size={20} className="text-blue-500" /> Annual Performance
              </h2>
              <p className="text-xs text-slate-400 font-medium">Data overview for the year {selectedYear}</p>
            </div>

            <div className="flex items-center gap-6">
                {/* 3. The Year Selector Dropdown */}
                <div className="relative group">
                    <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                        <option value="2026">FY 2026</option>
                        <option value="2025">FY 2025</option>
                        <option value="2024">FY 2024</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="hidden lg:flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Orders</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-400 rounded-sm"></div> Cost</div>
                </div>
            </div>
          </div>

          <div className="flex items-end justify-between h-72 border-b border-slate-100 pb-2 gap-1 overflow-x-auto lg:overflow-visible">
            {/* 4. Use selectedYear to pull the correct array */}
            {(allYearsData[selectedYear] || []).map((item, idx) => (
              <div key={idx} className="flex flex-col items-center group flex-1 min-w-[45px]">
                <div className="flex items-end gap-[2px] mb-3">
                  <div className={`${item.hO} w-3 md:w-4 bg-blue-500 rounded-t-sm transition-all group-hover:bg-blue-600 relative`}>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-10">
                      {item.orders} Orders
                    </span>
                  </div>
                  <div className={`${item.hC} w-3 md:w-4 bg-orange-400 rounded-t-sm transition-all group-hover:bg-orange-500 relative`}>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-10">
                      ₹{item.cost}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Updated Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Destination Table takes 3 columns */}
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={18} className="text-blue-500" /> Top Destination Cities
              </h2>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">View All</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4 text-center">Total Orders</th>
                    <th className="px-6 py-4 text-right">Courier Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cityData.map((data, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all cursor-default">
                      <td className="px-6 py-4 font-bold text-slate-700">{data.city}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{data.orders}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{data.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Smaller Financial Summary Holder - takes 1 column */}
          <div className="lg:col-span-1 bg-[#0F172A] text-white rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[200px]">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
            <TrendingUp size={20} className="text-orange-400 mb-4" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Summary {selectedYear}</h3>
            <div className="text-3xl font-black mt-2 tracking-tight">₹42,850</div>
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