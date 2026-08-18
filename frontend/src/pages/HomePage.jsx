import { useEffect, useState } from "react";
import {
  Truck,
  UploadCloud,
  BarChart3,
  FileText,
  ShieldCheck,
  Clock,
  Search,
  ArrowRight,
  Mail,
  Phone,
  X,
  Package,
  Building,
  User,
  Calendar,
  Sun,
  Moon,
  MapPin,
  Zap,
  Globe,
  ChevronRight,
  Route,
} from "lucide-react";
import aayshlogo2 from "../assets/aaysh_logo_2.png";
import { useNavigate } from "react-router-dom";
import WhatsAppBut from "../components/WhatsAppBut";
import { getPublicOrderByAwb } from "../api/ordersAPI";
import { formatDisplayDate } from "../utils/dateTime";
import OrderTracker from "../components/OrderTracker";

const THEME_KEY = "aaysh-home-theme";

const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(THEME_KEY) || "light";
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return { theme, toggle, isDark: theme === "dark" };
};

const HomePage = () => {
  const [awbNumber, setAwbNumber] = useState("");
  const navigate = useNavigate();
  const { theme, toggle, isDark } = useTheme();

  const [orderData, setOrderData] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [trackError, setTrackError] = useState(null);
  const [showTrackingResult, setShowTrackingResult] = useState(false);

  const t = isDark
    ? {
        page: "bg-[#060b14] text-slate-100",
        nav: "bg-[#060b14]/80 border-white/10 backdrop-blur-xl",
        navLink: "text-slate-400 hover:text-white",
        heroGlow: "from-cyan-500/20 via-blue-600/10 to-transparent",
        heroGrid: "opacity-[0.07]",
        badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        h1: "text-white",
        h1Accent: "text-cyan-400",
        sub: "text-slate-400",
        card: "bg-white/[0.04] border-white/10 backdrop-blur-md",
        cardHover: "hover:border-cyan-500/30 hover:bg-white/[0.06]",
        input: "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500/50",
        btnPrimary: "bg-cyan-500 hover:bg-cyan-400 text-[#060b14]",
        btnSecondary: "bg-white/10 hover:bg-white/15 text-white border border-white/10",
        statCard: "bg-gradient-to-br from-white/[0.06] to-white/[0.02] border-white/10",
        section: "bg-[#0a1120]",
        sectionAlt: "bg-[#060b14]",
        featureIcon: "bg-cyan-500/15 text-cyan-400",
        footer: "border-white/10 bg-[#040810] text-slate-500",
        trackSection: "bg-[#0a1120]/80 border-white/10",
        trackCard: "bg-white/[0.04] border-white/10",
        trackMuted: "text-slate-500",
        contactCard: "bg-white/[0.04] border-white/10",
      }
    : {
        page: "bg-[#f4f7fb] text-slate-800",
        nav: "bg-white/90 border-slate-200/80 backdrop-blur-xl",
        navLink: "text-slate-600 hover:text-[#1B2B4B]",
        heroGlow: "from-cyan-100/80 via-blue-50/50 to-transparent",
        heroGrid: "opacity-[0.35]",
        badge: "bg-cyan-50 text-cyan-700 border-cyan-200/60",
        h1: "text-[#1B2B4B]",
        h1Accent: "text-cyan-600",
        sub: "text-slate-500",
        card: "bg-white border-slate-200/80 shadow-sm",
        cardHover: "hover:border-cyan-200 hover:shadow-md",
        input: "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500",
        btnPrimary: "bg-[#1B2B4B] hover:bg-[#152238] text-white",
        btnSecondary: "bg-white hover:bg-slate-50 text-[#1B2B4B] border border-slate-200",
        statCard: "bg-white border-slate-200/80 shadow-sm",
        section: "bg-white",
        sectionAlt: "bg-[#f4f7fb]",
        featureIcon: "bg-[#1B2B4B] text-white",
        footer: "border-slate-200 bg-white text-slate-400",
        trackSection: "bg-slate-100/80 border-slate-200",
        trackCard: "bg-white border-slate-200",
        trackMuted: "text-slate-400",
        contactCard: "bg-white border-slate-200 shadow-lg",
      };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!awbNumber.trim()) return;

    try {
      setLoadingTrack(true);
      setTrackError(null);
      setShowTrackingResult(true);

      const res = await getPublicOrderByAwb(awbNumber.trim());

      if (res?.success && res.order) {
        setOrderData({
          ...res.order,
          expectedDeliveryDate: res.expectedDeliveryDate,
          shipping: {
            ...res.shipping,
            trackingHistory: res.tracking,
          },
        });
      } else {
        setOrderData(null);
        setTrackError("No shipment found for this AWB number.");
      }
    } catch (err) {
      console.error(err);
      setOrderData(null);
      const message = err?.message || "";
      setTrackError(
        message.toLowerCase().includes("not found") || message.toLowerCase().includes("no shipment")
          ? "No shipment found for this AWB number."
          : "Unable to fetch tracking. Please try again."
      );
    } finally {
      setLoadingTrack(false);
    }
  };

  const getStatusBadgeStyles = (status) => {
    const base = "text-xs font-bold px-3 py-1 rounded-full border";
    if (isDark) {
      switch (status) {
        case "Booked":
          return `${base} bg-emerald-500/15 text-emerald-300 border-emerald-500/30`;
        case "Delivered":
          return `${base} bg-cyan-500/15 text-cyan-300 border-cyan-500/30`;
        case "In Transit":
          return `${base} bg-blue-500/15 text-blue-300 border-blue-500/30`;
        case "Cancelled":
          return `${base} bg-rose-500/15 text-rose-300 border-rose-500/30`;
        default:
          return `${base} bg-white/10 text-slate-300 border-white/20`;
      }
    }
    switch (status) {
      case "Booked":
        return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
      case "Delivered":
        return `${base} bg-cyan-50 text-cyan-700 border-cyan-200`;
      case "In Transit":
        return `${base} bg-blue-50 text-blue-700 border-blue-200`;
      case "Cancelled":
        return `${base} bg-rose-50 text-rose-700 border-rose-200`;
      default:
        return `${base} bg-slate-100 text-slate-600 border-slate-200`;
    }
  };

  const features = [
    {
      icon: UploadCloud,
      title: "Bulk Order Upload",
      desc: "Import thousands of orders from Excel or CSV in one click with validated parsing.",
    },
    {
      icon: FileText,
      title: "AWB Management",
      desc: "Generate air waybills instantly and manage manifests across couriers.",
    },
    {
      icon: Route,
      title: "Live Tracking",
      desc: "Real-time shipment status updates from booking through delivery.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      desc: "Zone-wise performance, cost insights, and operational dashboards.",
    },
  ];

  const steps = [
    { num: "01", title: "Upload Orders", desc: "Drop your manifest file" },
    { num: "02", title: "Assign AWB", desc: "Auto courier selection" },
    { num: "03", title: "Schedule Pickup", desc: "Coordinate collections" },
    { num: "04", title: "Track & Deliver", desc: "End-to-end visibility" },
  ];

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-500 ${t.page}`}>
      <WhatsAppBut />

      {/* Nav */}
      <nav className={`sticky top-0 z-50 border-b transition-colors duration-500 ${t.nav}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <img src={aayshlogo2} alt="Aaysh Express" className="h-10 w-auto object-contain" />
            <span className={`text-lg font-bold tracking-tight hidden sm:block ${t.h1}`}>
              AAYSH<span className="text-cyan-500">EXPRESS</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className={`transition-colors ${t.navLink}`}>Features</a>
            <a href="#how-it-works" className={`transition-colors ${t.navLink}`}>How it works</a>
            <a href="#contact" className={`transition-colors ${t.navLink}`}>Support</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className={`p-2.5 rounded-xl transition-all ${t.btnSecondary}`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={`hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${t.btnPrimary}`}
            >
              Client Login <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${t.heroGlow} pointer-events-none`} />
        <div
          className={`absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px] ${t.heroGrid} pointer-events-none`}
          style={{ color: isDark ? "#fff" : "#1B2B4B" }}
        />
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border ${t.badge}`}>
                <Zap size={14} />
                Enterprise Logistics Platform
              </span>

              <h1 className={`text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.08] tracking-tight ${t.h1}`}>
                Ship smarter.{" "}
                <span className={t.h1Accent}>Track everything.</span>
              </h1>

              <p className={`text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed ${t.sub}`}>
                Aaysh Express powers end-to-end fulfillment — bulk uploads, AWB assignment,
                pickup scheduling, and live tracking in one premium workspace.
              </p>

              <div id="tracking" className={`p-2 rounded-2xl border max-w-lg mx-auto lg:mx-0 ${t.card}`}>
                <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 ${t.trackMuted}`} />
                    <input
                      type="text"
                      placeholder="Enter AWB number to track..."
                      value={awbNumber}
                      onChange={(e) => setAwbNumber(e.target.value)}
                      required
                      className={`w-full text-sm pl-11 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all ${t.input}`}
                    />
                  </div>
                  <button
                    type="submit"
                    className={`shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${t.btnPrimary}`}
                  >
                    <Truck size={16} />
                    Track
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${t.btnPrimary}`}
                >
                  Get Started <ArrowRight size={16} />
                </button>
                <a
                  href="#features"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${t.btnSecondary}`}
                >
                  Explore Features
                </a>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className={`rounded-3xl border p-6 space-y-4 ${t.card}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${t.trackMuted}`}>Network Coverage</p>
                      <p className={`text-lg font-bold ${t.h1}`}>Pan-India</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Active Shipments", value: "24/7", icon: Truck },
                    { label: "AWB Generation", value: "Instant", icon: FileText },
                    { label: "Pickup SLA", value: "Same Day", icon: Clock },
                    { label: "Secure Access", value: "Encrypted", icon: ShieldCheck },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-2xl p-4 border ${t.statCard}`}>
                      <item.icon className={`w-4 h-4 mb-2 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                      <p className={`text-lg font-bold ${t.h1}`}>{item.value}</p>
                      <p className={`text-[11px] mt-0.5 ${t.trackMuted}`}>{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className={`rounded-2xl p-4 border flex items-center gap-3 ${t.statCard}`}>
                  <MapPin className="w-5 h-5 text-cyan-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${t.trackMuted}`}>Latest route</p>
                    <p className={`text-sm font-semibold truncate ${t.h1}`}>
                      Mumbai → Delhi · In Transit
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${t.trackMuted}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tracking results */}
      {showTrackingResult && (
        <section className={`py-12 border-y transition-colors ${t.trackSection}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
            <button
              type="button"
              onClick={() => {
                setShowTrackingResult(false);
                setAwbNumber("");
              }}
              className={`absolute -top-2 right-4 p-2 rounded-full border transition-colors z-10 ${t.btnSecondary}`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {loadingTrack ? (
              <div className="flex flex-col items-center py-16">
                <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className={`text-sm font-medium ${t.sub}`}>Fetching shipment details...</p>
              </div>
            ) : trackError ? (
              <div className={`p-10 rounded-2xl border text-center max-w-md mx-auto ${t.trackCard}`}>
                <Package className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h2 className={`text-lg font-bold mb-2 ${t.h1}`}>Shipment Not Found</h2>
                <p className={`text-sm ${t.sub}`}>{trackError}</p>
              </div>
            ) : orderData ? (
              <div className="space-y-4">
                <div className={`rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${t.trackCard}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-500">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${t.trackMuted}`}>AWB Number</p>
                      <h1 className={`text-xl font-mono font-bold ${isDark ? "text-cyan-400" : "text-[#1B2B4B]"}`}>
                        {orderData.shipping?.awbNumber || orderData.awbNumber || "Unassigned"}
                      </h1>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs border-t md:border-t-0 md:border-l border-white/10 md:pl-6 pt-3 md:pt-0">
                    <div>
                      <span className={`block ${t.trackMuted}`}>Pickup Date</span>
                      <span className={`font-semibold flex items-center gap-1 mt-0.5 ${t.h1}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDisplayDate(orderData.shipping?.pickupDate)}
                      </span>
                    </div>
                    <div>
                      <span className={`block ${t.trackMuted}`}>Status</span>
                      <span className={`inline-flex mt-1 ${getStatusBadgeStyles(orderData.shipping?.shippingStatus || orderData.courierStatus)}`}>
                        {orderData.shipping?.shippingStatus || orderData.courierStatus || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl border p-2 ${t.trackCard}`}>
                  <OrderTracker
                    awbNumber={orderData.shipping?.awbNumber || orderData.awbNumber}
                    currentStatus={orderData.shipping?.shippingStatus || orderData.courierStatus || "Pending"}
                    trackingHistory={orderData.shipping?.trackingHistory || orderData.trackingHistory || []}
                    courierName={orderData.shipping?.courierName || orderData.courierName}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`rounded-2xl border overflow-hidden ${t.trackCard}`}>
                    <div className={`px-4 py-3 flex items-center gap-2 border-b ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-100 bg-slate-50"}`}>
                      <Building className="w-4 h-4 text-cyan-500" />
                      <h2 className={`text-xs uppercase font-bold tracking-wider ${t.trackMuted}`}>Shipper</h2>
                    </div>
                    <div className="p-4 text-sm">
                      <p className={`font-bold ${t.h1}`}>{orderData.consignorName || "—"}</p>
                      <p className={`text-xs mt-1 ${t.sub}`}>
                        {orderData.shipping?.pickupLocation || "Default Warehouse"}
                      </p>
                    </div>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden ${t.trackCard}`}>
                    <div className={`px-4 py-3 flex items-center gap-2 border-b ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-100 bg-slate-50"}`}>
                      <User className="w-4 h-4 text-emerald-500" />
                      <h2 className={`text-xs uppercase font-bold tracking-wider ${t.trackMuted}`}>Consignee</h2>
                    </div>
                    <div className="p-4 text-sm space-y-2">
                      <p className={`font-bold ${t.h1}`}>
                        {[orderData.consigneeName, orderData.consigneeLastName].filter(Boolean).join(" ") || "—"}
                      </p>
                      <p className={`text-xs ${t.sub}`}>
                        {orderData.address}
                        {orderData.address2 ? `, ${orderData.address2}` : ""}
                      </p>
                      <p className={`text-xs flex items-center gap-1 ${t.sub}`}>
                        <Phone className="w-3 h-3" />
                        {orderData.billingPhone || orderData.contactNo || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl border overflow-hidden ${t.trackCard}`}>
                  <div className={`px-4 py-3 flex items-center gap-2 border-b ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-100 bg-slate-50"}`}>
                    <FileText className="w-4 h-4 text-cyan-500" />
                    <h2 className={`text-xs uppercase font-bold tracking-wider ${t.trackMuted}`}>Manifest Details</h2>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
                    {[
                      { label: "Quantity", value: `${orderData.qty || 1} unit(s)` },
                      { label: "Invoice No", value: orderData.invoiceNo || "—" },
                      { label: "Value", value: `₹${orderData.invoiceValue || "0"}` },
                    ].map((item) => (
                      <div key={item.label} className="p-4">
                        <span className={`text-[10px] uppercase font-bold tracking-wider block ${t.trackMuted}`}>{item.label}</span>
                        <span className={`text-sm font-bold mt-1 block ${t.h1}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className={`py-24 transition-colors ${t.section}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500 mb-3">Platform</p>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${t.h1}`}>
              Built for modern logistics teams
            </h2>
            <p className={`mt-4 text-sm sm:text-base ${t.sub}`}>
              Everything you need to move goods at scale — from manifest upload to last-mile delivery.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group rounded-2xl border p-6 transition-all duration-300 ${t.card} ${t.cardHover}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 ${t.featureIcon}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold mb-2 ${t.h1}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${t.sub}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className={`py-24 transition-colors ${t.sectionAlt}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500 mb-3">Workflow</p>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${t.h1}`}>How it works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {i < steps.length - 1 && (
                  <div className={`hidden lg:block absolute top-8 left-[60%] w-[80%] h-px ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                )}
                <div className={`rounded-2xl border p-6 text-center ${t.card}`}>
                  <span className="text-3xl font-black text-cyan-500/30">{step.num}</span>
                  <h3 className={`text-base font-bold mt-2 ${t.h1}`}>{step.title}</h3>
                  <p className={`text-sm mt-1 ${t.sub}`}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust banner */}
      <section className={`py-20 relative overflow-hidden ${isDark ? "bg-[#0d1526]" : "bg-[#1B2B4B]"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.15),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400 mb-3">Enterprise Ready</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Reliable infrastructure for merchants at any scale
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              Role-based access, encrypted sessions, and real-time sync keep your fulfillment data secure and always up to date.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {["Multi-user permissions", "Real-time status sync", "Company-scoped data", "Audit-ready reports"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-200">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={`py-24 transition-colors ${t.section}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-500 mb-3">Support</p>
                <h2 className={`text-3xl font-bold tracking-tight ${t.h1}`}>We're here to help</h2>
                <p className={`mt-3 text-sm leading-relaxed ${t.sub}`}>
                  Reach our logistics desk or log in to submit a support ticket with attachments.
                </p>
              </div>
              <div className="space-y-4">
                <div className={`flex items-start gap-4 p-5 rounded-2xl border ${t.contactCard}`}>
                  <Mail className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-semibold text-sm ${t.h1}`}>Email</h4>
                    <p className={`text-sm mt-0.5 ${t.sub}`}>customersupport@aayshexpress.com</p>
                  </div>
                </div>
                <div className={`flex items-start gap-4 p-5 rounded-2xl border ${t.contactCard}`}>
                  <Phone className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-semibold text-sm ${t.h1}`}>Phone</h4>
                    <p className={`text-sm mt-0.5 ${t.sub}`}>+91 8882719505</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-3xl border p-10 text-center ${t.contactCard}`}>
              <h3 className={`text-xl font-bold ${t.h1}`}>Submit a Support Ticket</h3>
              <p className={`text-sm mt-3 max-w-sm mx-auto ${t.sub}`}>
                Log in to raise complaints, attach documents, and track resolution status.
              </p>
              <div className="flex flex-wrap gap-3 mt-8 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${t.btnPrimary}`}
                >
                  Log In <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/contact")}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${t.btnSecondary}`}
                >
                  Support Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-10 transition-colors ${t.footer}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className={`font-bold ${isDark ? "text-slate-300" : "text-[#1B2B4B]"}`}>
              AAYSH<span className="text-cyan-500">EXPRESS</span>
            </span>
            . All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Theme: <span className="capitalize font-medium text-cyan-500">{theme}</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
