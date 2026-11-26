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
  Calendar,
  Sun,
  Moon,
  Globe,
  ChevronRight,
  Route,
} from "lucide-react";
import aayshlogo2 from "../assets/aaysh_logo_2.png";
import { useNavigate } from "react-router-dom";

import WhatsAppBut from "../components/WhatsAppBut";
import { getPublicOrderByAwb } from "../api/ordersAPI";

const IMG = {
  hero: "/images/hero-logistics.jpg",
  features: "/images/features-warehouse.jpg",
  trust: "/images/trust-fleet.jpg",
};
import { formatDisplayDate } from "../utils/dateTime";
import { mapAwbTrackingOrder } from "../utils/trackingOrderMap";
import { getTrackingDeliveryDisplay } from "../utils/trackingDisplay";
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
        page: "bg-[#1F1F1F] text-slate-100",
        nav: "bg-[#1F1F1F]/95 border-white/10 backdrop-blur-xl",
        navLink: "text-slate-400 hover:text-white",
        h1: "text-white",
        sub: "text-slate-400",
        card: "bg-white/[0.04] border-white/10",
        cardHover: "hover:border-orange-500/40 hover:shadow-lg",
        input: "bg-white/95 border-white/20 text-[#2B2B2B] placeholder-slate-500",
        btnPrimary: "bg-[#F57C00] hover:bg-[#E06F00] text-white",
        btnSecondary: "bg-white/10 hover:bg-white/15 text-white border border-white/10",
        section: "bg-[#1F1F1F]",
        sectionAlt: "bg-[#2B2B2B]",
        featureIcon: "bg-orange-500/20 text-orange-400",
        footer: "border-white/10 bg-[#141414] text-slate-500",
        trackSection: "bg-[#2B2B2B] border-white/10",
        trackCard: "bg-white/[0.06] border-white/10",
        trackMuted: "text-slate-500",
        contactCard: "bg-white/[0.04] border-white/10",
      }
    : {
        page: "bg-white text-[#2B2B2B]",
        nav: "bg-white/95 border-slate-200 shadow-sm backdrop-blur-xl",
        navLink: "text-slate-600 hover:text-[#2B2B2B]",
        h1: "text-[#2B2B2B]",
        sub: "text-slate-600",
        card: "bg-white border-slate-200/90 shadow-sm",
        cardHover: "hover:border-orange-200 hover:shadow-md",
        input: "bg-white border-slate-200 text-[#2B2B2B] placeholder-slate-400 focus:border-orange-400 focus:ring-orange-400/20",
        btnPrimary: "bg-[#F57C00] hover:bg-[#E06F00] text-white",
        btnSecondary: "bg-white hover:bg-slate-50 text-[#2B2B2B] border border-slate-200",
        section: "bg-white",
        sectionAlt: "bg-slate-50",
        featureIcon: "bg-[#2B2B2B] text-[#F57C00]",
        footer: "border-slate-200 bg-white text-slate-500",
        trackSection: "bg-slate-50 border-slate-200",
        trackCard: "bg-white border-slate-200 shadow-sm",
        trackMuted: "text-slate-500",
        contactCard: "bg-white border-slate-200 shadow-lg",
      };

  const scrollToTrackingResults = () => {
    document.getElementById("tracking-results")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!awbNumber.trim()) return;

    try {
      setLoadingTrack(true);
      setTrackError(null);
      setShowTrackingResult(true);
      scrollToTrackingResults();

      const res = await getPublicOrderByAwb(awbNumber.trim());

      if (res?.success && (res.order || res.shipping)) {
        setOrderData(mapAwbTrackingOrder(res));
      } else {
        setOrderData(null);
        setTrackError("No shipment found for this AWB number.");
      }
    } catch (err) {
      console.error(err);
      setOrderData(null);
      const message = err?.message || "";
      setTrackError(
        message.toLowerCase().includes("temporarily unavailable")
          ? message
          : message.toLowerCase().includes("valid awb")
            ? "Please enter a valid AWB number."
            : message.toLowerCase().includes("not found") || message.toLowerCase().includes("no shipment")
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
          return `${base} bg-orange-500/15 text-orange-300 border-orange-500/30`;
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
        return `${base} bg-orange-50 text-orange-800 border-orange-200`;
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 min-w-0 shrink-0">
            <img src={aayshlogo2} alt="Aaysh Express" className="h-10 sm:h-11 w-auto object-contain" />
            <span className={`text-base sm:text-lg font-bold tracking-tight hidden xs:block ${t.h1}`}>
              AAYSH<span className="text-[#F57C00]">EXPRESS</span>
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-10 text-sm font-semibold">
            <a href="#track" className={`transition-colors ${t.navLink}`}>
              Track parcel
            </a>
            <a href="#features" className={`transition-colors ${t.navLink}`}>
              Features
            </a>
            <a href="#how-it-works" className={`transition-colors ${t.navLink}`}>
              How it works
            </a>
            <a href="#contact" className={`transition-colors ${t.navLink}`}>
              Support
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
              className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${t.btnPrimary}`}
            >
              Client Login <ChevronRight size={16} className="hidden sm:block" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero — truck left, content right */}
      <header id="track" className="relative min-h-[min(92vh,880px)] flex items-center overflow-hidden">
        <img
          src={IMG.hero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[12%_48%] sm:object-[10%_46%] lg:object-left"
          loading="eager"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 bg-gradient-to-l from-[#1F1F1F]/95 via-[#2B2B2B]/85 to-[#2B2B2B]/45 from-0% via-50% to-100%"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"
          aria-hidden
        />
        {/* Mobile: extra tint behind lower content only */}
        <div
          className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#1F1F1F]/90 via-[#2B2B2B]/70 to-transparent lg:hidden pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 flex justify-end items-end lg:items-center min-h-[min(92vh,880px)]">
          <div className="w-full max-w-xl sm:max-w-lg lg:max-w-2xl xl:max-w-3xl ml-auto space-y-5 sm:space-y-6 lg:space-y-8">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white/10 text-white border border-white/20 backdrop-blur-sm lg:ml-auto">
              <Truck size={14} className="text-[#F57C00]" />
              Pan-India logistics
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-white">
              Delivering trust
              <span className="block mt-2 text-[#F57C00]">across every mile</span>
            </h1>

            <p className="text-base sm:text-lg max-w-xl leading-relaxed text-slate-200">
              Book, ship, and track with Aaysh Express — built for growing brands that need
              reliability, speed, and full shipment visibility.
            </p>

            <div className="rounded-2xl border border-white/15 bg-white/95 backdrop-blur-md p-5 sm:p-7 shadow-2xl shadow-black/30 w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-[#2B2B2B] text-[#F57C00]">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2B2B2B]">Track your shipment</h2>
                  <p className="text-xs text-slate-500">Enter AWB / consignment number</p>
                </div>
              </div>
              <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Enter AWB number"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  className="flex-1 text-base px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-[#2B2B2B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F57C00]/40 focus:border-[#F57C00]"
                />
                <button
                  type="submit"
                  disabled={loadingTrack}
                  className="px-8 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide text-white bg-[#F57C00] hover:bg-[#E06F00] shadow-md shadow-orange-900/25 disabled:opacity-70 transition-colors"
                >
                  {loadingTrack ? "Searching…" : "Track"}
                </button>
              </form>
              <p className="text-[11px] mt-3 text-slate-500">
                AWB not in Aaysh? We also query Trackon automatically.
              </p>
            </div>

            <div className="flex flex-wrap gap-5 pt-1 lg:justify-end">
              {[
                { icon: ShieldCheck, label: "Secure platform" },
                { icon: Clock, label: "24×7 tracking" },
                { icon: Globe, label: "Nationwide" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Icon className="w-4 h-4 text-[#F57C00]" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Tracking results */}
      {showTrackingResult && (
        <section
          id="tracking-results"
          className={`py-12 border-y transition-colors ${t.trackSection}`}
        >
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
                <div className="w-10 h-10 border-2 border-[#F57C00] border-t-transparent rounded-full animate-spin mb-4" />
                <p className={`text-sm font-medium ${t.sub}`}>Fetching shipment details...</p>
              </div>
            ) : trackError ? (
              <div className={`p-10 rounded-2xl border text-center max-w-md mx-auto ${t.trackCard}`}>
                <Package className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h2 className={`text-lg font-bold mb-2 ${t.h1}`}>Shipment Not Found</h2>
                <p className={`text-sm ${t.sub}`}>{trackError}</p>
              </div>
            ) : orderData ? (
              (() => {
                const deliveryRow = getTrackingDeliveryDisplay(orderData);
                return (
              <div className="space-y-4">
                {orderData.trackonOnly && (
                  <div className={`text-center text-xs font-medium px-4 py-2 rounded-lg border ${isDark ? "border-orange-500/30 text-orange-200 bg-orange-500/10" : "border-orange-200 text-orange-900 bg-orange-50"}`}>
                    Live tracking from Trackon courier network (shipment not booked in Aaysh)
                  </div>
                )}
                <div className={`rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${t.trackCard}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-orange-500/15 text-[#F57C00]">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${t.trackMuted}`}>AWB Number</p>
                      <h1 className={`text-xl font-mono font-bold ${isDark ? "text-orange-400" : "text-[#2B2B2B]"}`}>
                        {orderData.shipping?.awbNumber || orderData.awbNumber || "Unassigned"}
                      </h1>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs border-t md:border-t-0 md:border-l border-white/10 md:pl-6 pt-3 md:pt-0">
                    <div>
                      <span className={`block ${t.trackMuted}`}>
                        {deliveryRow.label}
                      </span>
                      <span className={`font-semibold flex items-center gap-1 mt-0.5 ${t.h1}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {deliveryRow.value}
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

              </div>
                );
              })()
            ) : null}
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className={`py-20 lg:py-24 transition-colors ${t.section}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-16 lg:mb-20 rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm">
            <div className="relative min-h-[220px] sm:min-h-[320px] bg-[#2B2B2B]">
              <img
                src={IMG.features}
                alt="Warehouse and fulfillment operations"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#1F1F1F]/38" aria-hidden />
            </div>
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F57C00] mb-3">Why Aaysh</p>
              <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${t.h1}`}>
                End-to-end shipping built for business
              </h2>
              <p className={`mt-4 text-sm sm:text-base leading-relaxed ${t.sub}`}>
                Upload orders in bulk, assign courier AWBs, schedule pickups, and monitor every
                milestone — with the same tools your operations team uses inside the client portal.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2B2B2B] hover:bg-[#1F1F1F] transition-colors"
              >
                Open client portal <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F57C00] mb-3">Platform</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F57C00] mb-3">Workflow</p>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight ${t.h1}`}>How it works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {i < steps.length - 1 && (
                  <div className={`hidden lg:block absolute top-8 left-[60%] w-[80%] h-px ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                )}
                <div className={`rounded-2xl border p-6 text-center ${t.card}`}>
                  <span className="text-3xl font-black text-[#F57C00]/25">{step.num}</span>
                  <h3 className={`text-base font-bold mt-2 ${t.h1}`}>{step.title}</h3>
                  <p className={`text-sm mt-1 ${t.sub}`}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust banner */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <img
          src={IMG.trust}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#2B2B2B]/90" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F57C00] mb-3">Enterprise Ready</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Reliable infrastructure for merchants at any scale
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              Role-based access, encrypted sessions, and real-time sync keep your fulfillment data secure and always up to date.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {["Multi-user permissions", "Real-time status sync", "Company-scoped data", "Audit-ready reports"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-200">
                  <ShieldCheck className="w-5 h-5 text-[#F57C00] shrink-0" />
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
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F57C00] mb-3">Support</p>
                <h2 className={`text-3xl font-bold tracking-tight ${t.h1}`}>We're here to help</h2>
                <p className={`mt-3 text-sm leading-relaxed ${t.sub}`}>
                  Reach our logistics desk or log in to submit a support ticket with attachments.
                </p>
              </div>
              <div className="space-y-4">
                <div className={`flex items-start gap-4 p-5 rounded-2xl border ${t.contactCard}`}>
                  <Mail className="w-5 h-5 text-[#F57C00] shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-semibold text-sm ${t.h1}`}>Email</h4>
                    <p className={`text-sm mt-0.5 ${t.sub}`}>customersupport@aayshexpress.com</p>
                  </div>
                </div>
                <div className={`flex items-start gap-4 p-5 rounded-2xl border ${t.contactCard}`}>
                  <Phone className="w-5 h-5 text-[#F57C00] shrink-0 mt-0.5" />
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
            <span className={`font-bold ${isDark ? "text-slate-300" : "text-[#2B2B2B]"}`}>
              AAYSH<span className="text-[#F57C00]">EXPRESS</span>
            </span>
            . All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Theme: <span className="capitalize font-medium text-[#F57C00]">{theme}</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
