import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getDashboardData } from '../api/dashboardAPI';
import {
  BarChart3,
  Package,
  Truck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  TrendingUp,
  PieChart,
  ChevronRight as ChevronRightSmall,
  IndianRupee,
  CreditCard,
  Layers,
  Map,
  AlertTriangle,
} from 'lucide-react';
import { toast } from '../utils/toast';

const NAVY = '#1B2B4B';
const NAVY_LIGHT = '#E8ECF4';
const PAGE_BG = '#EFF2F6';

const CHART_HEIGHT = 260;
const CHART_WIDTH = 720;
const CHART_PAD = { top: 28, right: 24, bottom: 40, left: 36 };

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatCompactNumber = (value) => {
  const amount = Number(value) || 0;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return amount.toLocaleString('en-IN');
};

const percentOfTotal = (value, total) => {
  if (!total) return 0;
  return Math.round((Number(value) / Number(total)) * 100);
};

const buildScale = (maxValue) => {
  if (maxValue <= 0) return { scaleMax: 1 };
  const scaleMax = Math.ceil(maxValue * 1.25);
  return { scaleMax };
};

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getCurrentWeekOfMonth = () => Math.min(4, Math.ceil(new Date().getDate() / 7));

const TabSwitcher = ({ tabs, active, onChange }) => (
  <div className="flex items-center bg-[#F4F6FA] rounded-full p-1">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          active === tab.id
            ? 'bg-white text-[#1B2B4B] shadow-sm'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const ShareBar = ({ percent, tone = 'bg-[#1B2B4B]' }) => (
  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(percent, 100)}%` }} />
  </div>
);

const RISK_STYLES = {
  None: 'bg-slate-100 text-slate-500',
  Low: 'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-700',
  Critical: 'bg-rose-50 text-rose-700',
};

const RiskBadge = ({ level }) => (
  <span
    className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
      RISK_STYLES[level] || RISK_STYLES.None
    }`}
  >
    {level}
  </span>
);

const PaginatedTable = ({ rows, columns, page, perPage, onPageChange, emptyMessage }) => {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const start = (page - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr key={`${row.id || row.label}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-4 ${col.align === 'right' ? 'text-right' : ''} ${
                        col.mono ? 'font-mono font-bold text-[#1B2B4B]' : ''
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > perPage && (
        <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

const AnalyticsChart = ({ chartData, emptyMessage }) => {
  const [tooltip, setTooltip] = useState(null);
  const chartWrapRef = useRef(null);

  const displayData = chartData;

  const maxOrders = Math.max(...displayData.map((item) => item.orders || 0), 1);
  const { scaleMax } = buildScale(maxOrders);

  const plotWidth = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotHeight = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const plotBottom = CHART_PAD.top + plotHeight;

  const getX = (index) =>
    CHART_PAD.left + ((index + 0.5) / displayData.length) * plotWidth;

  const getY = (value) => plotBottom - (value / scaleMax) * plotHeight;

  const hoveredItem = tooltip !== null ? displayData[tooltip.index] : null;
  const hasData = displayData.some(
    (item) => (item.orders || 0) > 0 && item.name !== '-'
  );

  const showTooltip = (event, index) => {
    const container = chartWrapRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setTooltip({
      index,
      x: event.clientX - rect.left + container.scrollLeft,
      y: event.clientY - rect.top + container.scrollTop,
    });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <div className="bg-white rounded-[22px] p-6 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white">
      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
          <BarChart3 size={32} className="mb-2 opacity-40" />
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <div ref={chartWrapRef} className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full min-w-150 h-auto"
            onMouseLeave={hideTooltip}
          >
            {displayData.map((item, index) => {
              const x = getX(index);
              const slot = plotWidth / displayData.length;
              const barW = Math.min(slot * 0.34, 18);
              const orders = item.orders || 0;
              const bgH = (maxOrders / scaleMax) * plotHeight * 0.85;
              const fgH = (orders / scaleMax) * plotHeight;
              const isHovered = tooltip?.index === index;

              return (
                <g
                  key={`${item.name}-${index}`}
                  onMouseEnter={(event) => showTooltip(event, index)}
                  onMouseMove={(event) => showTooltip(event, index)}
                >
                  {isHovered && (
                    <line
                      x1={x}
                      x2={x}
                      y1={CHART_PAD.top}
                      y2={plotBottom}
                      stroke="#1B2B4B"
                      strokeOpacity="0.12"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  )}
                  <rect
                    x={x - barW / 2}
                    y={plotBottom - bgH}
                    width={barW}
                    height={bgH}
                    rx="6"
                    fill={NAVY_LIGHT}
                  />
                  <rect
                    x={x - barW / 2}
                    y={plotBottom - fgH}
                    width={barW}
                    height={fgH}
                    rx="6"
                    fill={isHovered ? '#152238' : NAVY}
                  />
                  <text
                    x={x}
                    y={CHART_HEIGHT - 10}
                    textAnchor="middle"
                    className={`text-[9px] font-semibold ${
                      isHovered ? 'fill-[#1B2B4B]' : 'fill-slate-400'
                    }`}
                  >
                    {item.label && item.label !== '-' ? item.label : item.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredItem && tooltip && (
            <div
              className="pointer-events-none absolute z-20 min-w-[170px] rounded-xl bg-[#1B2B4B] px-3.5 py-2.5 text-white shadow-lg"
              style={{
                left: tooltip.x + 14,
                top: tooltip.y - 10,
                transform: 'translateY(-100%)',
              }}
            >
              <p className="text-[11px] font-bold text-slate-300 mb-1">
                {hoveredItem.label && hoveredItem.label !== '-'
                  ? `${hoveredItem.label} (${hoveredItem.name})`
                  : hoveredItem.name}
              </p>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span>Orders: {hoveredItem.orders || 0}</span>
                <span className="opacity-40">|</span>
                <span>Revenue: {formatCurrency(hoveredItem.cost || 0)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DeliveryRing = ({ percent }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke={NAVY_LIGHT} strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={NAVY}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Delivery</span>
        <span className="text-2xl font-black text-[#1B2B4B]">{percent}%</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [chartView, setChartView] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekOfMonth());
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    chartData: [],
    chartMeta: null,
    topCities: [],
    salesAnalytics: null,
    shipmentAnalytics: null,
    riskAnalytics: null,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [salesTab, setSalesTab] = useState('zone');
  const [shipmentTab, setShipmentTab] = useState('zone');
  const [riskTab, setRiskTab] = useState('zone');
  const [salesPage, setSalesPage] = useState(1);
  const [shipmentPage, setShipmentPage] = useState(1);
  const [riskPage, setRiskPage] = useState(1);
  const citiesPerPage = 5;
  const analyticsPerPage = 8;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const data = await getDashboardData({
          year: selectedYear,
          view: chartView,
          month: selectedMonth,
          week: selectedWeek,
        });
        setDashboardData({
          stats: data.stats || {},
          chartData: data.chartData || [],
          chartMeta: data.chartMeta || null,
          topCities: data.topCities || [],
          salesAnalytics: data.salesAnalytics || null,
          shipmentAnalytics: data.shipmentAnalytics || null,
          riskAnalytics: data.riskAnalytics || null,
          totalCost: data.totalCost || 0,
        });
        setCurrentPage(1);
        setSalesPage(1);
        setShipmentPage(1);
        setRiskPage(1);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedYear, chartView, selectedMonth, selectedWeek]);

  const stats = dashboardData.stats;
  const salesAnalytics = dashboardData.salesAnalytics;
  const shipmentAnalytics = dashboardData.shipmentAnalytics;
  const riskAnalytics = dashboardData.riskAnalytics;
  const totalOrders = stats.totalOrders || 0;
  const deliveredOrders = stats.deliveredOrders || 0;
  const deliveryPercent = percentOfTotal(deliveredOrders, totalOrders);

  const indexOfLastCity = currentPage * citiesPerPage;
  const indexOfFirstCity = indexOfLastCity - citiesPerPage;
  const currentCities = dashboardData.topCities.slice(indexOfFirstCity, indexOfLastCity);
  const totalPages = Math.ceil(dashboardData.topCities.length / citiesPerPage);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const shipmentCards = [
    {
      label: 'Total Shipment',
      value: totalOrders,
      icon: PieChart,
      share: 100,
      tone: 'text-emerald-600',
    },
    {
      label: 'Pickup Package',
      value: stats.bookedOrders || 0,
      icon: Package,
      share: percentOfTotal(stats.bookedOrders, totalOrders),
      tone: 'text-emerald-600',
    },
    {
      label: 'Pending',
      value: stats.pendingOrders || 0,
      icon: Clock,
      share: percentOfTotal(stats.pendingOrders, totalOrders),
      tone: 'text-rose-500',
    },
    {
      label: 'Delivery Shipments',
      value: deliveredOrders,
      icon: Truck,
      share: deliveryPercent,
      tone: 'text-emerald-600',
    },
  ];

  const statusTimeline = [
    { label: 'Pending', count: stats.pendingOrders || 0 },
    { label: 'Booked', count: stats.bookedOrders || 0 },
    { label: 'Shipped', count: stats.shippedOrders || 0 },
    { label: 'In Transit', count: stats.inTransitOrders || 0 },
    { label: 'Delivered', count: deliveredOrders },
  ];

  const displayName = user?.companyName || user?.email?.split('@')[0] || 'User';

  const salesZoneRows = (salesAnalytics?.byZone || []).map((row) => ({
    id: row.zone,
    label: row.zone,
    orders: row.orders,
    revenue: row.revenue,
    sharePercent: row.sharePercent,
    avgOrder: row.orders ? Math.round(row.revenue / row.orders) : 0,
  }));

  const salesStateRows = (salesAnalytics?.byState || []).map((row) => ({
    id: row.state,
    label: row.state,
    orders: row.orders,
    revenue: row.revenue,
    sharePercent: row.sharePercent,
    avgOrder: row.orders ? Math.round(row.revenue / row.orders) : 0,
  }));

  const shipmentZoneRows = (shipmentAnalytics?.byZone || []).map((row) => ({
    id: row.zone,
    label: row.zone,
    ...row,
  }));

  const shipmentStateRows = (shipmentAnalytics?.byState || []).map((row) => ({
    id: row.state,
    label: row.state,
    ...row,
  }));

  const salesRows = salesTab === 'zone' ? salesZoneRows : salesStateRows;
  const shipmentRows = shipmentTab === 'zone' ? shipmentZoneRows : shipmentStateRows;

  const riskZoneRows = (riskAnalytics?.byZone || []).map((row) => ({
    id: row.zone,
    label: row.zone,
    ...row,
  }));

  const riskStateRows = (riskAnalytics?.byState || []).map((row) => ({
    id: row.state,
    label: row.state,
    ...row,
  }));

  const riskRows = riskTab === 'zone' ? riskZoneRows : riskStateRows;
  const flaggedRiskRows =
    riskTab === 'zone'
      ? riskAnalytics?.flaggedZones || []
      : riskAnalytics?.flaggedStates || [];

  const riskBarTone = (level) => {
    if (level === 'Critical') return 'bg-rose-500';
    if (level === 'High') return 'bg-orange-500';
    if (level === 'Medium') return 'bg-amber-500';
    if (level === 'Low') return 'bg-emerald-500';
    return 'bg-slate-300';
  };

  const riskColumns = [
    {
      key: 'label',
      label: riskTab === 'zone' ? 'Zone' : 'State',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-[#1B2B4B]">{row.label}</p>
            {(row.riskLevel === 'High' || row.riskLevel === 'Critical') && (
              <AlertTriangle size={14} className="text-rose-500 shrink-0" />
            )}
          </div>
          <div className="mt-2 max-w-[180px]">
            <ShareBar percent={row.delayRatio} tone={riskBarTone(row.riskLevel)} />
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      label: 'Shipments',
      render: (row) => <span className="text-slate-600 font-medium">{row.total}</span>,
    },
    {
      key: 'delayed',
      label: 'Delayed',
      render: (row) => <span className="text-rose-600 font-bold">{row.delayed}</span>,
    },
    {
      key: 'sla',
      label: 'SLA Breach',
      render: (row) => <span className="text-orange-600 font-semibold">{row.slaBreaches}</span>,
    },
    {
      key: 'atRisk',
      label: 'At Risk',
      render: (row) => <span className="text-[#1B2B4B] font-bold">{row.atRisk}</span>,
    },
    {
      key: 'ratio',
      label: 'Delay Ratio',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-[#1B2B4B]">{row.delayRatio}%</span>
      ),
    },
    {
      key: 'relative',
      label: 'vs Avg',
      align: 'right',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.relativeRiskRatio >= 2 ? 'text-rose-600' : 'text-slate-500'
          }`}
        >
          {row.relativeRiskRatio}x
        </span>
      ),
    },
    {
      key: 'risk',
      label: 'Risk',
      align: 'right',
      render: (row) => <RiskBadge level={row.riskLevel} />,
    },
  ];

  const salesColumns = [
    {
      key: 'label',
      label: salesTab === 'zone' ? 'Zone' : 'State',
      render: (row) => (
        <div>
          <p className="font-bold text-[#1B2B4B]">{row.label}</p>
          <div className="mt-2 max-w-[180px]">
            <ShareBar percent={row.sharePercent} />
          </div>
        </div>
      ),
    },
    {
      key: 'orders',
      label: 'Orders',
      render: (row) => <span className="text-slate-600 font-medium">{row.orders}</span>,
    },
    {
      key: 'revenue',
      label: 'Sales',
      align: 'right',
      mono: true,
      render: (row) => `₹${Number(row.revenue || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'share',
      label: 'Share',
      align: 'right',
      render: (row) => <span className="text-slate-500 font-semibold">{row.sharePercent}%</span>,
    },
    {
      key: 'avg',
      label: 'Avg Order',
      align: 'right',
      mono: true,
      render: (row) => `₹${Number(row.avgOrder || 0).toLocaleString('en-IN')}`,
    },
  ];

  const shipmentColumns = [
    {
      key: 'label',
      label: shipmentTab === 'zone' ? 'Zone' : 'State',
      render: (row) => <span className="font-bold text-[#1B2B4B]">{row.label}</span>,
    },
    {
      key: 'total',
      label: 'Total',
      render: (row) => <span className="text-slate-600 font-medium">{row.total}</span>,
    },
    {
      key: 'captured',
      label: 'Captured',
      render: (row) => <span className="text-sky-600 font-bold">{row.captured}</span>,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      render: (row) => <span className="text-emerald-600 font-bold">{row.delivered}</span>,
    },
    {
      key: 'inTransit',
      label: 'In Transit',
      render: (row) => <span className="text-amber-600 font-semibold">{row.inTransit}</span>,
    },
    {
      key: 'pending',
      label: 'Pending',
      render: (row) => <span className="text-slate-500 font-semibold">{row.pending}</span>,
    },
    {
      key: 'rto',
      label: 'RTO',
      render: (row) => <span className="text-rose-500 font-semibold">{row.rto}</span>,
    },
    {
      key: 'revenue',
      label: 'Sales Value',
      align: 'right',
      mono: true,
      render: (row) => `₹${Number(row.revenue || 0).toLocaleString('en-IN')}`,
    },
  ];

  return (
    <div
      className="-m-4 md:-m-6 min-h-full rounded-xl overflow-hidden"
      style={{ backgroundColor: PAGE_BG }}
    >
      <div className="p-5 md:p-8 space-y-6">
        {/* Shipment summary cards */}
        <div>
          <h2 className="text-sm font-bold text-[#1B2B4B] mb-4">Shipments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {shipmentCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white rounded-[20px] p-5 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F4F6FA] flex items-center justify-center text-[#1B2B4B] mb-4">
                    <Icon size={18} />
                  </div>
                  <p className="text-3xl font-black text-[#1B2B4B]">{card.value}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-1">{card.label}</p>
                  <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${card.tone}`}>
                    <TrendingUp size={14} />
                    <span>{card.share}% of volume</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="xl:col-span-8 space-y-6">
            {/* Analytics */}
            <div className="space-y-4">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#1B2B4B]">Analytics</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="appearance-none bg-white border border-slate-100 rounded-full pl-4 pr-9 py-2 text-xs font-bold text-[#1B2B4B] shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-[#1B2B4B]/10"
                      aria-label="Fiscal year"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          FY {year}
                        </option>
                      ))}
                    </select>
                    <CalendarDays
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>

                  {chartView === 'week' && (
                    <>
                      <div className="relative">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="appearance-none bg-white border border-slate-100 rounded-full pl-4 pr-9 py-2 text-xs font-bold text-[#1B2B4B] shadow-sm cursor-pointer outline-none focus:ring-2 focus:ring-[#1B2B4B]/10"
                          aria-label="Month"
                        >
                          {MONTH_OPTIONS.map((month, index) => (
                            <option key={month} value={index + 1}>
                              {month}
                            </option>
                          ))}
                        </select>
                        <CalendarDays
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>

                      <div className="flex items-center bg-white rounded-full p-1 shadow-sm border border-slate-100">
                        {[1, 2, 3, 4].map((week) => (
                          <button
                            key={week}
                            type="button"
                            onClick={() => setSelectedWeek(week)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              selectedWeek === week
                                ? 'bg-[#1B2B4B] text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Week {week}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex items-center bg-white rounded-full p-1 shadow-sm border border-slate-100">
                    {['week', 'month'].map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setChartView(view)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                          chartView === view
                            ? 'bg-[#1B2B4B] text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <AnalyticsChart
                chartData={dashboardData.chartData}
                emptyMessage={
                  chartView === 'week'
                    ? `No analytics for Week ${selectedWeek}, ${MONTH_OPTIONS[selectedMonth - 1]} ${selectedYear}`
                    : `No analytics for ${selectedYear}`
                }
              />
            </div>

            {/* Sales Analytics */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#1B2B4B]">Sales Analytics</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zone-wise and state-wise captured sales for FY {selectedYear}
                  </p>
                </div>
                <TabSwitcher
                  tabs={[
                    { id: 'zone', label: 'Zone-wise' },
                    { id: 'state', label: 'State-wise' },
                  ]}
                  active={salesTab}
                  onChange={(tab) => {
                    setSalesTab(tab);
                    setSalesPage(1);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Sales',
                    value: formatCurrency(salesAnalytics?.totalRevenue || 0),
                    icon: IndianRupee,
                  },
                  {
                    label: 'COD Sales',
                    value: formatCurrency(salesAnalytics?.paymentBreakdown?.cod?.revenue || 0),
                    sub: `${salesAnalytics?.paymentBreakdown?.cod?.orders || 0} orders`,
                    icon: Package,
                  },
                  {
                    label: 'Prepaid Sales',
                    value: formatCurrency(salesAnalytics?.paymentBreakdown?.prepaid?.revenue || 0),
                    sub: `${salesAnalytics?.paymentBreakdown?.prepaid?.orders || 0} orders`,
                    icon: CreditCard,
                  },
                  {
                    label: 'Avg Order Value',
                    value: formatCurrency(salesAnalytics?.avgOrderValue || 0),
                    sub: `${salesAnalytics?.totalOrders || 0} total orders`,
                    icon: TrendingUp,
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.label}
                      className="bg-white rounded-[20px] p-5 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#F4F6FA] flex items-center justify-center text-[#1B2B4B] mb-3">
                        <Icon size={18} />
                      </div>
                      <p className="text-xl font-black text-[#1B2B4B]">{card.value}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">{card.label}</p>
                      {card.sub && (
                        <p className="text-[11px] text-slate-400 mt-2 font-medium">{card.sub}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-50">
                  <h3 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
                    <Layers size={16} />
                    {salesTab === 'zone' ? 'Sales by Zone' : 'Sales by State'}
                  </h3>
                </div>
                <PaginatedTable
                  rows={salesRows}
                  columns={salesColumns}
                  page={salesPage}
                  perPage={analyticsPerPage}
                  onPageChange={setSalesPage}
                  emptyMessage={loading ? 'Loading sales analytics...' : 'No sales data available.'}
                />
              </div>
            </div>

            {/* Shipment Analytics */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#1B2B4B]">Shipment Analytics</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Captured shipments, delivery performance, and exceptions by geography
                  </p>
                </div>
                <TabSwitcher
                  tabs={[
                    { id: 'zone', label: 'Zone-wise' },
                    { id: 'state', label: 'State-wise' },
                  ]}
                  active={shipmentTab}
                  onChange={(tab) => {
                    setShipmentTab(tab);
                    setShipmentPage(1);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {[
                  {
                    label: 'Total Shipments',
                    value: shipmentAnalytics?.summary?.total || 0,
                    tone: 'text-[#1B2B4B]',
                  },
                  {
                    label: 'Captured',
                    value: shipmentAnalytics?.summary?.captured || 0,
                    tone: 'text-sky-600',
                  },
                  {
                    label: 'Delivered',
                    value: shipmentAnalytics?.summary?.delivered || 0,
                    tone: 'text-emerald-600',
                  },
                  {
                    label: 'Pending',
                    value: shipmentAnalytics?.summary?.pending || 0,
                    tone: 'text-amber-600',
                  },
                  {
                    label: 'RTO / Cancelled',
                    value:
                      (shipmentAnalytics?.summary?.rto || 0) +
                      (shipmentAnalytics?.summary?.cancelled || 0),
                    tone: 'text-rose-500',
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-white rounded-[20px] p-5 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white"
                  >
                    <p className={`text-2xl font-black ${card.tone}`}>{card.value}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{card.label}</p>
                    {card.label === 'Captured' && (
                      <p className="text-[11px] text-sky-500 font-bold mt-2">
                        {shipmentAnalytics?.captureRate || 0}% capture rate
                      </p>
                    )}
                    {card.label === 'Delivered' && (
                      <p className="text-[11px] text-emerald-500 font-bold mt-2">
                        {shipmentAnalytics?.deliveryRate || 0}% delivery rate
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-50">
                  <h3 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
                    <Truck size={16} />
                    {shipmentTab === 'zone' ? 'Shipments by Zone' : 'Shipments by State'}
                  </h3>
                </div>
                <PaginatedTable
                  rows={shipmentRows}
                  columns={shipmentColumns}
                  page={shipmentPage}
                  perPage={analyticsPerPage}
                  onPageChange={setShipmentPage}
                  emptyMessage={loading ? 'Loading shipment analytics...' : 'No shipment data available.'}
                />
              </div>
            </div>

            {/* Delivery Risk Analysis */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Delivery Risk Analysis
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Delayed shipments and SLA breaches by zone and state
                  </p>
                </div>
                <TabSwitcher
                  tabs={[
                    { id: 'zone', label: 'Zone-wise' },
                    { id: 'state', label: 'State-wise' },
                  ]}
                  active={riskTab}
                  onChange={(tab) => {
                    setRiskTab(tab);
                    setRiskPage(1);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Overall Delay Ratio',
                    value: `${riskAnalytics?.summary?.overallDelayRatio || 0}%`,
                    sub: `Risk level: ${riskAnalytics?.summary?.overallRiskLevel || 'None'}`,
                    tone: 'text-[#1B2B4B]',
                  },
                  {
                    label: 'At-Risk Shipments',
                    value: riskAnalytics?.summary?.atRisk || 0,
                    sub: `${riskAnalytics?.summary?.delayed || 0} delayed · ${riskAnalytics?.summary?.slaBreaches || 0} SLA breach`,
                    tone: 'text-rose-600',
                  },
                  {
                    label: `High-Risk ${riskTab === 'zone' ? 'Zones' : 'States'}`,
                    value:
                      riskTab === 'zone'
                        ? riskAnalytics?.summary?.flaggedZoneCount || 0
                        : riskAnalytics?.summary?.flaggedStateCount || 0,
                    sub: 'Marked High or Critical',
                    tone: 'text-orange-600',
                  },
                  {
                    label: 'Delivered (Baseline)',
                    value: riskAnalytics?.summary?.delivered || 0,
                    sub: `of ${riskAnalytics?.summary?.total || 0} total shipments`,
                    tone: 'text-emerald-600',
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-white rounded-[20px] p-5 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white"
                  >
                    <p className={`text-2xl font-black ${card.tone}`}>{card.value}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{card.label}</p>
                    <p className="text-[11px] text-slate-400 mt-2 font-medium">{card.sub}</p>
                  </div>
                ))}
              </div>

              {flaggedRiskRows.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3">
                  <p className="text-xs font-bold text-rose-700 mb-2">Flagged for attention</p>
                  <div className="flex flex-wrap gap-2">
                    {flaggedRiskRows.slice(0, 8).map((row) => (
                      <span
                        key={row.zone || row.state}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-100"
                      >
                        <AlertTriangle size={12} />
                        {row.zone || row.state}
                        <span className="text-rose-500 font-bold">{row.delayRatio}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-50">
                  <h3 className="text-sm font-bold text-[#1B2B4B]">
                    {riskTab === 'zone' ? 'Delay Risk by Zone' : 'Delay Risk by State'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Delay ratio = at-risk shipments ÷ total · vs Avg compares to network average (
                    {riskAnalytics?.summary?.overallDelayRatio || 0}%)
                  </p>
                </div>
                <PaginatedTable
                  rows={riskRows}
                  columns={riskColumns}
                  page={riskPage}
                  perPage={analyticsPerPage}
                  onPageChange={setRiskPage}
                  emptyMessage={loading ? 'Loading risk analysis...' : 'No risk data available.'}
                />
              </div>
            </div>

            {/* Top cities table */}
            <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
                    <Map size={16} />
                    Top Cities by Volume
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Highest order destinations in FY {selectedYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-500">
                    {currentPage} {' / '} {totalPages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50">
                      <th className="px-6 py-4">City</th>
                      <th className="px-6 py-4">Orders</th>
                      <th className="px-6 py-4">Volume</th>
                      <th className="px-6 py-4 text-right">Sales Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {currentCities.map((row, idx) => (
                      <tr key={`${row.city}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-bold text-[#1B2B4B]">
                          <span className="text-slate-400 mr-1">#</span>
                          {row.city}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{row.orders}</td>
                        <td className="px-6 py-4 text-slate-500">{formatCompactNumber(row.orders)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[#1B2B4B]">
                          ₹{Number(row.cost || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {currentCities.length === 0 && !loading && (
                  <div className="py-12 text-center text-slate-400 text-sm">No city data available.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="xl:col-span-4 space-y-5">
            {/* Tracking ring */}
            <div className="bg-white rounded-[22px] p-6 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white">
              <DeliveryRing percent={deliveryPercent} />
              <div className="mt-6 space-y-2">
                {[
                  { label: 'Total Orders', value: totalOrders },
                  { label: 'In Transit', value: (stats.inTransitOrders || 0) + (stats.shippedOrders || 0) },
                  { label: 'Delivered', value: deliveredOrders },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#F8FAFC] border border-slate-100"
                  >
                    <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                    <div className="flex items-center gap-2 text-[#1B2B4B] font-bold text-sm">
                      {item.value}
                      <ChevronRightSmall size={14} className="text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile */}
            <div className="bg-white rounded-[22px] p-5 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1B2B4B] text-white flex items-center justify-center text-lg font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#1B2B4B] text-sm truncate">{displayName}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{user?.email || '-'}</p>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    {[user?.address, user?.city, user?.state, user?.country]
                      .filter(Boolean)
                      .join(', ') || 'Address not available'}
                  </p>
                </div>
              </div>
            </div>

            {/* Revenue summary */}
            <div className="bg-[#1B2B4B] rounded-[22px] p-6 text-white shadow-[0_8px_30px_rgba(27,43,75,0.15)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Revenue {selectedYear}
              </p>
              <p className="text-3xl font-black mt-2">{formatCurrency(dashboardData.totalCost || 0)}</p>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Total invoice value from orders placed in the selected fiscal year.
              </p>
            </div>

            {/* Status timeline */}
            <div className="bg-white rounded-[22px] p-6 shadow-[0_8px_30px_rgba(27,43,75,0.06)] border border-white">
              <h3 className="text-sm font-bold text-[#1B2B4B] mb-5 flex items-center gap-2">
                <MapPin size={16} />
                Shipment Status
              </h3>
              <div className="space-y-0">
                {statusTimeline.map((step, index) => (
                  <div key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          step.count > 0 ? 'bg-[#1B2B4B]' : 'bg-slate-200'
                        }`}
                      />
                      {index < statusTimeline.length - 1 && (
                        <div className="w-px flex-1 min-h-[28px] bg-slate-200 my-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-bold text-[#1B2B4B]">{step.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {step.count} orders · FY {selectedYear}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-4 border-t border-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Exceptions</span>
                <span className="font-bold text-rose-500">
                  {(stats.delayedOrders || 0) + (stats.cancelledOrders || 0) + (stats.rtoOrders || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
