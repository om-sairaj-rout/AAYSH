import React, { useState } from 'react';
import { 
  Truck, 
  UploadCloud, 
  BarChart3, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  Phone, 
  X,
  Package,
  Building,
  User,
  Calendar
} from 'lucide-react';
import aayshlogo2 from "../assets/aaysh_logo_2.png";
import { useNavigate } from 'react-router-dom';
import WhatsAppBut from "../components/WhatsAppBut";
import { submitContactForm } from "../api/contactAPI";
import { getOrderByAwb } from '../api/ordersAPI';
import { toast } from 'react-hot-toast'; // Imported for toast alerts

const HomePage = () => {
  const [awbNumber, setAwbNumber] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', businessName: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  // New Inline Tracking States
  const [orderData, setOrderData] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [trackError, setTrackError] = useState(null);
  const [showTrackingResult, setShowTrackingResult] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Updated: Core tracking logic renders content dynamically on the exact same view
  const handleTrack = async (e) => {
    e.preventDefault();

    if (!awbNumber.trim()) return;

    try {
      setLoadingTrack(true);
      setTrackError(null);
      setShowTrackingResult(true); // Open container view to present status state

      const res = await getOrderByAwb(awbNumber.trim());

      if (res?.success && res?.order) {
        setOrderData(res.order);
      } else {
        setOrderData(null);
        setTrackError("No shipment information found matching this AWB number.");
      }
    } catch (err) {
      console.error(err);
      setOrderData(null);
      setTrackError("Failed to communicate with the database services.");
    } finally {
      setLoadingTrack(false);
    }
  };

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Booked': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Not Shipped': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await submitContactForm(formData);

      if (res.success) {
        setSubmitted(true);
        setFormData({ name: "", email: "", businessName: "", message: "" });
      } else {
        toast.error(res.message || "Failed to send"); // Swapped alert with toast
      }
    } catch (err) {
      console.log(err);
      toast.error("Server error"); // Swapped alert with toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased relative">
      <WhatsAppBut />
      
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-white p-2.5 rounded-lg flex items-center justify-center">
              <img src={aayshlogo2} alt="aaysh-logo" className="mx-auto w-25 h-15" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">AAYSH<span className="text-teal-600">EXPRESS</span></span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact Support</a>
          </div>
          <div>
            <button
              onClick={() => navigate('/login')} 
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/10"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero & Tracking Input Box */}
      <header className="relative bg-gradient-to-b from-white via-slate-50 to-slate-100/80 py-20 lg:py-28 overflow-hidden border-b border-slate-200">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none hidden lg:block" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column Text & Search Form */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                Enterprise Logistics & Supply Chain Ecosystem
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-none">
                Smart delivery management, <span className="text-blue-600">optimized paths.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-500 font-normal max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Streamline your bulk orders, generate instant Air Waybills (AWB), monitor annual cost performance metrics, and keep live operations error-free with AAYSH EXPRESS.
              </p>
              
              {/* Quick Tracker Utility */}
              <div id="tracking" className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xl max-w-md mx-auto lg:mx-0">
                <form onSubmit={handleTrack} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search Order By AWB Number..." 
                      value={awbNumber}
                      onChange={(e) => setAwbNumber(e.target.value)}
                      required
                      className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-5 py-3 rounded-xl transition-colors shrink-0">
                    Track Shipments
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column Grid Displays */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4 relative">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">3x</div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Velocity</h4>
                <p className="text-slate-500 text-xs font-light">Accelerating commercial scaling for partner e-commerce platforms.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-2 mt-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">100%</div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Real-Time Sync</h4>
                <p className="text-slate-500 text-xs font-light">Automated data updates for transit pipelines.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">Live</div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AWB Dispatch</h4>
                <p className="text-slate-500 text-xs font-light">Instant single or multi-sheet manifests.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-2 mt-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">Analytics</div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost Audits</h4>
                <p className="text-slate-500 text-xs font-light">Track annual metrics relative to delivery weight margins.</p>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* DYNAMIC TRACKING DISPLAY AREA (Renders inline upon search submission) */}
      {showTrackingResult && (
        <section className="bg-slate-100/50 py-12 border-b border-slate-200 animate-fadeIn">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <button 
              onClick={() => { setShowTrackingResult(false); setAwbNumber(''); }}
              className="absolute -top-4 right-4 p-2 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
              title="Close tracking details"
            >
              <X className="w-4 h-4" />
            </button>

            {loadingTrack ? (
              <div className="w-full flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-500">Retrieving operational cargo streams...</p>
              </div>
            ) : trackError ? (
              <div className="bg-white p-8 rounded-xl border border-gray-200 max-w-md mx-auto text-center shadow-sm space-y-4">
                <Package className="w-12 h-12 text-rose-500 mx-auto" />
                <h2 className="text-lg font-bold text-slate-900">Tracking Disruption</h2>
                <p className="text-sm text-slate-500">{trackError}</p>
              </div>
            ) : orderData ? (
              <div className="space-y-4">
                {/* Identity Container */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">AWB Number</p>
                      <h1 className="text-xl font-mono font-bold text-blue-800">{orderData.awbNumber || "Unassigned"}</h1>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6">
                    <div>
                      <span className="text-slate-400 font-medium block">Pickup Reference</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {orderData.pickupDate ? new Date(orderData.pickupDate).toLocaleDateString('en-GB') : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Status</span>
                      <div className="flex my-0.5">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadgeStyles(orderData.courierStatus)}`}>
                          {orderData.courierStatus || "Unknown"}
                        </span>
                      </div>
                    </div>
                    {orderData.courierStatus === "Delivered" && orderData.deliveryDate && (
                <div className="mt-2">
                  <span className="text-slate-400 font-medium block">
                    Delivery Date
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(orderData.deliveryDate).toLocaleDateString("en-GB")}
                  </span>
                </div>
              )}
                  </div>
                </div>

                {/* Sender & Recipient Split Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-100 bg-slate-50 px-4 py-3 flex items-center gap-2 text-slate-500">
                      <Building className="w-4 h-4 text-blue-500" />
                      <h2 className="text-xs uppercase font-bold tracking-wider">Shipper / Consignor</h2>
                    </div>
                    <div className="p-4 space-y-2 text-sm">
                      <p className="font-bold text-slate-800">{orderData.consignorName || "ABC Manufacturing Ltd."}</p>
                      <div className="text-slate-600 space-y-1">
                        <p>45 Science Park Drive,</p>
                        <p>Tech City, CA 94043</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-100 bg-slate-50 px-4 py-3 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4 text-emerald-500" />
                      <h2 className="text-xs uppercase font-bold tracking-wider">To / Consignee</h2>
                    </div>
                    <div className="p-4 space-y-3 text-sm">
                      <div>
                        <p className="font-bold text-slate-800 text-base">{orderData.consigneeName ? orderData.consigneeName.toUpperCase() : "-"}</p>
                        <p className="text-slate-600 mt-1 font-medium leading-relaxed">{orderData.address ? orderData.address.toUpperCase() : "-"}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-50 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block font-medium">Destination Layout</span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            {orderData.destinationCity}, {orderData.destinationState} - {orderData.destinationPincode}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Contact Lines</span>
                          <span className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {orderData.contactNo || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Specifications Table Matrix */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 bg-slate-50 px-4 py-3 flex items-center gap-2 text-slate-500">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <h2 className="text-xs uppercase font-bold tracking-wider">Financial & Manifest Specifications</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 text-center">
                    <div className="p-4">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">Package Quantity</span>
                      <span className="text-lg font-bold text-slate-800 block mt-1">{orderData.qty || "1"} Unit(s)</span>
                    </div>
                    <div className="p-4">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">Invoice Reference</span>
                      <span className="text-base font-bold text-slate-700 font-mono block mt-1.5 truncate" title={orderData.invoiceNo}>{orderData.invoiceNo || "-"}</span>
                    </div>
                    <div className="p-4">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">Invoice Value</span>
                      <span className="text-lg font-bold text-emerald-700 font-mono block mt-1 text-emerald-700">₹{orderData.invoiceValue || "0.00"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Core Operational Workflows Section */}
      <section id="features" className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              End-to-End Core Modules built for Speed
            </h2>
            <p className="text-slate-500 font-light max-w-xl mx-auto text-sm sm:text-base">
              AAYSH EXPRESS encapsulates complex routing and status tracking into a single clean client workspace view.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-md shadow-blue-600/10 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Upload Management</h3>
              <p className="mt-2 text-slate-500 text-xs leading-relaxed font-light">
                Drop excel or CSV data sheets to batch parse massive datasets effortlessly without manual layout errors.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-5 shadow-md shadow-teal-600/10 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Awb Management</h3>
              <p className="mt-2 text-slate-500 text-xs leading-relaxed font-light">
                Generate air waybills immediately. Track routing history logs, update structural package constraints, and isolate critical manifest nodes instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center mb-5 shadow-md shadow-orange-600/10 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Status Management</h3>
              <p className="mt-2 text-slate-500 text-xs leading-relaxed font-light">
                Isolate deliveries marked in transit, flag delayed timelines early, or check verified delivered checkpoints cleanly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-5 shadow-md shadow-purple-600/10 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Annual Performance</h3>
              <p className="mt-2 text-slate-500 text-xs leading-relaxed font-light">
                Visually track year-over-year cost analysis and overall volume distribution charts with automated client reporting features.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Commitment Content Banner */}
      <section id="solutions" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Security & Operational Continuity</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Enterprise-grade reliability for merchants of any scale.
            </h2>
            <p className="text-slate-400 font-light text-sm sm:text-base leading-relaxed">
              We understand that fulfillment data infrastructure is structural to your commercial health. Our system ensures maximum database reliability, fast data parsing configurations, and encrypted access for your sub-users.
            </p>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium text-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" /> Multi-user Permissions Control
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" /> Continuous Data Infrastructure Sync
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Support Section */}
      <section id="contact" className="py-20 sm:py-24 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Get in Touch with our Logistics Desk</h2>
                <p className="mt-3 text-slate-500 text-sm font-light leading-relaxed">
                  Have questions regarding your enterprise account config? Connect with us via the adjacent console desk.
                </p>
              </div>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                  <Mail className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Digital Network Communications</h4>
                    <p className="font-light text-xs text-slate-500 mt-0.5">support@aayshexpress.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                  <Phone className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Direct Merchant Hotline</h4>
                    <p className="font-light text-xs text-slate-500 mt-0.5">+91 (120) 456-7890 / Corporate Helpline</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-lg relative">
              {submitted ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Inquiry Logged Successfully</h3>
                  <p className="text-slate-500 text-sm font-light max-w-sm mx-auto">
                    Your transmission data has arrived at our support infrastructure matrix. A logistics coordinator will reach out to you within 24 operational hours.
                  </p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium underline underline-offset-4"
                  >
                    Submit another operational support ticket
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Name</label>
                      <input 
                        type="text" required name="name" value={formData.name} onChange={handleInputChange} placeholder="John Doe"
                        className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Business Email Address</label>
                      <input 
                        type="email" required name="email" value={formData.email} onChange={handleInputChange} placeholder="john@company.com"
                        className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company / Organization Identity</label>
                    <input 
                      type="text" required name="businessName" value={formData.businessName} onChange={handleInputChange} placeholder="e.g. Enterprise Global Ltd"
                      className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message Context / System Requirements</label>
                    <textarea 
                      rows="4" required name="message" value={formData.message} onChange={handleInputChange} placeholder="Detail your typical daily fulfillment payload..."
                      className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <button 
                    type="submit" disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-md shadow-blue-600/10"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Submit Corporate Ticket <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400 font-medium tracking-wide">
        {new Date().getFullYear()} © Powered By <span className="text-slate-700 font-bold">AAYSH<span className="text-teal-600">EXPRESS</span></span>. All Rights Reserved.
      </footer>
    </div>
  );
};

export default HomePage;