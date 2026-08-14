import { useState } from "react";
import {
  IndianRupee,
  CreditCard,
  Package,
  Truck,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react";

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

const MiniStat = ({ label, value, sub, tone = "text-[#1B2B4B]" }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
    <p className={`text-lg font-black ${tone}`}>{value}</p>
    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
  </div>
);

const ZoneTable = ({ title, rows, valueKey, valueLabel }) => (
  <div className="rounded-xl border border-slate-100 overflow-hidden">
    <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-slate-100">
      <p className="text-xs font-bold text-[#1B2B4B]">{title}</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-4 py-2">Zone</th>
            <th className="px-4 py-2 text-right">Orders</th>
            <th className="px-4 py-2 text-right">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                No data
              </td>
            </tr>
          ) : (
            rows.slice(0, 5).map((row) => (
              <tr key={row.zone || row.state}>
                <td className="px-4 py-2 font-semibold text-[#1B2B4B]">
                  {row.zone || row.state}
                </td>
                <td className="px-4 py-2 text-right text-slate-600">
                  {row.orders ?? row.total ?? 0}
                </td>
                <td className="px-4 py-2 text-right font-mono font-bold text-[#1B2B4B]">
                  {valueKey === "revenue"
                    ? formatCurrency(row.revenue || row.cost || 0)
                    : row[valueKey] ?? 0}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const OrdersAnalyticsPanel = ({
  loading,
  salesAnalytics,
  shipmentAnalytics,
  scopeLabel,
  analyticsYear,
  onYearChange,
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
            <TrendingUp size={16} />
            Sales & Shipment Analytics
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{scopeLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={analyticsYear}
            onChange={(e) => {
              e.stopPropagation();
              onYearChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-bold text-[#1B2B4B] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {[0, 1, 2].map((offset) => {
              const year = new Date().getFullYear() - offset;
              return (
                <option key={year} value={String(year)}>
                  FY {year}
                </option>
              );
            })}
          </select>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading analytics...</p>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Sales
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MiniStat
                    label="Total Sales"
                    value={formatCurrency(salesAnalytics?.totalRevenue || 0)}
                    sub={`${salesAnalytics?.totalOrders || 0} orders`}
                  />
                  <MiniStat
                    label="COD Sales"
                    value={formatCurrency(salesAnalytics?.paymentBreakdown?.cod?.revenue || 0)}
                    sub={`${salesAnalytics?.paymentBreakdown?.cod?.orders || 0} orders`}
                    tone="text-sky-600"
                  />
                  <MiniStat
                    label="Prepaid Sales"
                    value={formatCurrency(salesAnalytics?.paymentBreakdown?.prepaid?.revenue || 0)}
                    sub={`${salesAnalytics?.paymentBreakdown?.prepaid?.orders || 0} orders`}
                    tone="text-indigo-600"
                  />
                  <MiniStat
                    label="Avg Order Value"
                    value={formatCurrency(salesAnalytics?.avgOrderValue || 0)}
                    icon={IndianRupee}
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Shipments
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <MiniStat
                    label="Total"
                    value={shipmentAnalytics?.summary?.total || 0}
                  />
                  <MiniStat
                    label="Captured"
                    value={shipmentAnalytics?.summary?.captured || 0}
                    sub={`${shipmentAnalytics?.captureRate || 0}% rate`}
                    tone="text-sky-600"
                  />
                  <MiniStat
                    label="Delivered"
                    value={shipmentAnalytics?.summary?.delivered || 0}
                    sub={`${shipmentAnalytics?.deliveryRate || 0}% rate`}
                    tone="text-emerald-600"
                  />
                  <MiniStat
                    label="In Transit"
                    value={
                      (shipmentAnalytics?.summary?.inTransit || 0) +
                      (shipmentAnalytics?.summary?.shipped || 0)
                    }
                    tone="text-amber-600"
                  />
                  <MiniStat
                    label="Pending"
                    value={shipmentAnalytics?.summary?.pending || 0}
                    tone="text-slate-500"
                  />
                  <MiniStat
                    label="RTO / Cancelled"
                    value={
                      (shipmentAnalytics?.summary?.rto || 0) +
                      (shipmentAnalytics?.summary?.cancelled || 0)
                    }
                    tone="text-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ZoneTable
                  title="Sales by Zone"
                  rows={salesAnalytics?.byZone || []}
                  valueKey="revenue"
                  valueLabel="Sales"
                />
                <ZoneTable
                  title="Shipments by Zone"
                  rows={shipmentAnalytics?.byZone || []}
                  valueKey="delivered"
                  valueLabel="Delivered"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersAnalyticsPanel;
