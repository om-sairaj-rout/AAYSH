import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { toast } from '../utils/toast';
import {
  createReversePickup,
  getReversePickups,
  searchReversePickupCustomers,
  getReversePickupDocumentUrl,
} from "../api/reversePickupAPI";
import { getOrderByAwb } from "../api/ordersAPI";
import { getCompanyDetail } from "../api/companyAPI";
import { getProducts } from "../api/productsAPI";
import { canAccess } from "../utils/permissions";
import { formatDisplayDate, todayISODateOnly } from "../utils/dateTime";
import ReversePickupRouteCell from "../components/ReversePickupRouteCell";
import {
  getReversePickupAwb,
  getReversePickupCourier,
  getReversePickupStatusClass,
  getReversePickupStatusDisplay,
} from "../utils/reversePickupDisplay";


const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white";

const HIGH_VALUE_INVOICE_THRESHOLD = 50000;

const buildEmptyForm = (user) => ({
  requestDate: todayISODateOnly(),
  originalAwbNumber: "",
  pickupDate: todayISODateOnly(),
  pickupTime: new Date().toTimeString().slice(0, 5),
  pickupFor: user?.companyName || "",
  modeType: "Surface",
  fromName: "",
  fromAddress: "",
  fromAddress2: "",
  fromPincode: "",
  fromCity: "",
  fromState: "",
  fromPhone: "",
  fromEmail: "",
  toName: user?.companyName || "",
  toAddress: "",
  toPincode: "",
  toCity: "",
  toState: "",
  toPhone: "",
  itemDescription: "",
  paperWork: "INVOICE",
  invoiceValue: "",
  pieces: "1",
  weight: "",
  remarks: "",
  supportingDocument: null,
});

const Section = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      )}
    </div>
    {children}
  </div>
);

const Field = ({ label, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold text-slate-500 mb-1.5">
      {label}
    </span>
    {children}
  </label>
);

const ReversePickupPage = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "reversePickup", "write");

  const [form, setForm] = useState(() => buildEmptyForm(user));
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [awbLoading, setAwbLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchTimer = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [selectedRequest, setSelectedRequest] = useState(null);

  const previewRequestNo = useMemo(
    () => `REV-RP-${Date.now().toString().slice(-8)}`,
    []
  );

  const invoiceValueNumber = Number(form.invoiceValue) || 0;
  const isDocumentRequired =
    invoiceValueNumber >= HIGH_VALUE_INVOICE_THRESHOLD;
  const totalPages = pagination.total_pages || 1;
  const totalRequests = pagination.total || 0;

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getReversePickups({
        page: currentPage,
        perPage,
        search: debouncedSearch,
      });
      setRequests(res.requests || []);
      setPagination(res.meta?.pagination || { total: 0, total_pages: 1 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch]);

  const loadCompanyDefaults = useCallback(async () => {
    if (!user?.companyID) return;
    try {
      const res = await getCompanyDetail(user.companyID);
      const company = res.company;
      if (!company) return;
      setForm((prev) => ({
        ...prev,
        toName: company.companyName || prev.toName,
        toAddress: company.address || prev.toAddress,
        toCity: company.city || prev.toCity,
        toState: company.state || prev.toState,
        toPincode: company.zip_code || prev.toPincode,
        pickupFor: company.companyName || prev.pickupFor,
      }));
    } catch {
      // optional prefill
    }
  }, [user?.companyID]);

  useEffect(() => {
    loadCompanyDefaults();
    getProducts()
      .then((res) => setProducts(res.products || []))
      .catch(() => {});
  }, [loadCompanyDefaults]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, perPage]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (customerSearchTimer.current) {
      clearTimeout(customerSearchTimer.current);
    }

    const query = customerSearchQuery.trim();
    if (query.length < 2) {
      setCustomerResults([]);
      setCustomerSearchLoading(false);
      return undefined;
    }

    customerSearchTimer.current = setTimeout(async () => {
      try {
        setCustomerSearchLoading(true);
        const res = await searchReversePickupCustomers(query);
        setCustomerResults(res.customers || []);
        setShowCustomerDropdown(true);
      } catch (error) {
        setCustomerResults([]);
        toast.error(error.message);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 350);

    return () => {
      if (customerSearchTimer.current) {
        clearTimeout(customerSearchTimer.current);
      }
    };
  }, [customerSearchQuery]);

  const applyCustomer = (customer) => {
    setForm((prev) => ({
      ...prev,
      fromName: customer.name || prev.fromName,
      fromPhone: customer.phone || prev.fromPhone,
      fromEmail: customer.email || prev.fromEmail,
      fromAddress: customer.address || prev.fromAddress,
      fromAddress2: customer.address2 || prev.fromAddress2,
      fromCity: customer.city || prev.fromCity,
      fromState: customer.state || prev.fromState,
      fromPincode: customer.pincode || prev.fromPincode,
    }));
    setCustomerSearchQuery(customer.name || "");
    setCustomerResults([]);
    setShowCustomerDropdown(false);
    toast.success("Customer details filled");
  };

  const loadFromOriginalAwb = async () => {
    const awb = form.originalAwbNumber.trim();
    if (!awb) {
      toast.validation("Enter the original shipment AWB number");
      return;
    }

    try {
      setAwbLoading(true);
      const res = await getOrderByAwb(awb);
      const order = res.order;
      const shipping = res.shipping;

      const consigneeName = [order.consigneeName, order.consigneeLastName]
        .filter(Boolean)
        .join(" ");

      const firstItem = order.orderItems?.[0];

      setForm((prev) => ({
        ...prev,
        fromName: consigneeName || prev.fromName,
        fromPhone: order.billingPhone || prev.fromPhone,
        fromEmail: order.consigneeEmail || prev.fromEmail,
        fromAddress: [order.address, order.address2].filter(Boolean).join(", "),
        fromCity: order.destinationCity || prev.fromCity,
        fromState: order.destinationState || prev.fromState,
        fromPincode: order.destinationPincode || prev.fromPincode,
        toName: order.consignorName || prev.toName,
        toAddress: shipping?.pickupLocation || prev.toAddress,
        weight: String(order.weight || shipping?.totalWeight || prev.weight || ""),
        pieces: String(order.noOfBoxes || order.qty || prev.pieces || "1"),
        itemDescription: firstItem?.name || prev.itemDescription,
        invoiceValue: String(order.invoiceValue ?? prev.invoiceValue ?? ""),
        modeType:
          shipping?.serviceType === "air"
            ? "Air"
            : shipping?.serviceType === "prime"
              ? "Prime"
              : "Surface",
      }));

      toast.success("Original shipment loaded — pickup & delivery details filled");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAwbLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      toast.error("You do not have permission to submit reverse pickup requests");
      return;
    }

    if (isDocumentRequired && !form.supportingDocument) {
      toast.error(
        "Supporting document is required when invoice value is ₹50,000 or above"
      );
      return;
    }

    if (!/^\d{10}$/.test(String(form.fromPhone || "").replace(/\D/g, ""))) {
      toast.error("Pickup phone number must be exactly 10 digits");
      return;
    }

    try {
      setSubmitting(true);
      await createReversePickup({
        ...form,
        weight: Number(form.weight) || 0,
        pieces: Number(form.pieces) || 1,
        invoiceValue: Number(form.invoiceValue) || 0,
      });
      toast.success("Reverse pickup request submitted for admin approval");
      setForm(buildEmptyForm(user));
      setCustomerSearchQuery("");
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      await loadCompanyDefaults();
      await loadRequests();
      setShowForm(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page bg-[#EFF2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
            <ArrowLeftRight size={24} />
            Reverse Pickup
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Return a shipment to your origin warehouse due to logistic issues.
            Link the original AWB to auto-fill pickup and delivery details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadRequests}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B2B4B] text-white px-4 py-2.5 text-sm font-bold"
            >
              <Plus size={16} />
              {showForm ? "Hide Form" : "New Request"}
            </button>
          )}
        </div>
      </div>

      {canWrite && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[22px] shadow-sm border border-white p-5 md:p-6 space-y-8"
        >
          <Section
            title="Request Details"
            description="Enter the original AWB and schedule for the reverse pickup."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <Field label="Request Date">
                <input
                  type="date"
                  required
                  value={form.requestDate}
                  onChange={(e) => setField("requestDate", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Request No">
                <input
                  readOnly
                  value={previewRequestNo}
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                />
              </Field>
              <Field label="Original AWB No">
                <div className="flex gap-2">
                  <input
                    value={form.originalAwbNumber}
                    onChange={(e) => setField("originalAwbNumber", e.target.value)}
                    placeholder="Shipment AWB"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={loadFromOriginalAwb}
                    disabled={awbLoading}
                    className="shrink-0 rounded-xl bg-[#1B2B4B] text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                  >
                    {awbLoading ? "..." : "Load"}
                  </button>
                </div>
              </Field>
              <Field label="Pickup Schedule">
                <input
                  type="date"
                  required
                  min={todayISODateOnly()}
                  value={form.pickupDate}
                  onChange={(e) => setField("pickupDate", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Pickup Time">
                <input
                  type="time"
                  required
                  min="11:00"
                  max="17:00"
                  value={form.pickupTime}
                  onChange={(e) => setField("pickupTime", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Pickup For">
                <div className="relative">
                  <input
                    required
                    value={form.pickupFor}
                    onChange={(e) => setField("pickupFor", e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
              <Field label="Mode Type">
                <select
                  value={form.modeType}
                  onChange={(e) => setField("modeType", e.target.value)}
                  className={inputClass}
                >
                  <option value="Surface">Surface</option>
                  <option value="Air">Air</option>
                  <option value="Prime">Prime</option>
                </select>
              </Field>
            </div>
          </Section>

          <div className="border-t border-slate-100 pt-8">
            <Section
              title="Pickup Detail"
              description="Search existing customers or enter pickup location manually."
            >
              <Field label="Search Customer" className="sm:col-span-2 lg:col-span-4">
                <div className="relative">
                  <input
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => {
                      if (customerResults.length > 0) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCustomerDropdown(false), 150);
                    }}
                    placeholder="Search by customer name (min 2 characters)"
                    className={inputClass}
                  />
                  {customerSearchLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      Searching...
                    </span>
                  )}
                  {showCustomerDropdown && !customerSearchLoading && customerSearchQuery.trim().length >= 2 && customerResults.length === 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg px-4 py-3 text-xs text-slate-500">
                      No customers found for this name.
                    </div>
                  )}
                  {showCustomerDropdown && customerResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-72 overflow-y-auto">
                      <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                        {customerResults.length} matching customer{customerResults.length === 1 ? "" : "s"} — select one
                      </p>
                      {customerResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyCustomer(customer)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                        >
                          <p className="font-semibold text-sm text-[#1B2B4B]">
                            {customer.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {customer.phone || "No phone"}
                            {customer.email ? ` · ${customer.email}` : ""}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {[customer.address, customer.address2].filter(Boolean).join(", ")}
                            {customer.city || customer.pincode
                              ? ` · ${[customer.city, customer.state, customer.pincode].filter(Boolean).join(", ")}`
                              : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:col-span-2 lg:col-span-4">
                <Field label="Name">
                  <input
                    required
                    value={form.fromName}
                    onChange={(e) => setField("fromName", e.target.value)}
                    placeholder="Customer name"
                    className={inputClass}
                  />
                </Field>
                <Field label="Address" className="sm:col-span-2">
                  <input
                    required
                    value={form.fromAddress}
                    onChange={(e) => setField("fromAddress", e.target.value)}
                    placeholder="Full address"
                    className={inputClass}
                  />
                </Field>
                <Field label="Pincode">
                  <div className="relative">
                    <input
                      required
                      value={form.fromPincode}
                      onChange={(e) => setField("fromPincode", e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
                <Field label="City">
                  <input
                    required
                    value={form.fromCity}
                    onChange={(e) => setField("fromCity", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="State">
                  <input
                    required
                    value={form.fromState}
                    onChange={(e) => setField("fromState", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Mobile">
                  <div className="relative">
                    <input
                      required
                      value={form.fromPhone}
                      onChange={(e) => setField("fromPhone", e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
              </div>
            </Section>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <Section
              title="Delivery Detail"
              description="Your warehouse / origin — where the package will be returned."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Name">
                  <input
                    required
                    value={form.toName}
                    onChange={(e) => setField("toName", e.target.value)}
                    placeholder="Warehouse / company name"
                    className={inputClass}
                  />
                </Field>
                <Field label="Address" className="sm:col-span-2">
                  <input
                    required
                    value={form.toAddress}
                    onChange={(e) => setField("toAddress", e.target.value)}
                    placeholder="Return address"
                    className={inputClass}
                  />
                </Field>
                <Field label="Pincode">
                  <div className="relative">
                    <input
                      required
                      value={form.toPincode}
                      onChange={(e) => setField("toPincode", e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
                <Field label="City">
                  <input
                    required
                    value={form.toCity}
                    onChange={(e) => setField("toCity", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="State">
                  <input
                    required
                    value={form.toState}
                    onChange={(e) => setField("toState", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Mobile">
                  <div className="relative">
                    <input
                      value={form.toPhone}
                      onChange={(e) => setField("toPhone", e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
              </div>
            </Section>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <Section title="Item & Documents">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Item Description">
                  <input
                    list="product-items"
                    required
                    value={form.itemDescription}
                    onChange={(e) => setField("itemDescription", e.target.value)}
                    placeholder="e.g. EAR PHONE"
                    className={inputClass}
                  />
                  <datalist id="product-items">
                    {products.map((p) => (
                      <option key={p._id} value={p.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Paper Work">
                  <select
                    value={form.paperWork}
                    onChange={(e) => setField("paperWork", e.target.value)}
                    className={inputClass}
                  >
                    <option value="INVOICE">INVOICE</option>
                    <option value="EWAYBILL">EWAYBILL</option>
                    <option value="DELIVERY_CHALLAN">DELIVERY CHALLAN</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </Field>
                <Field label="Invoice Value">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.invoiceValue}
                    onChange={(e) => setField("invoiceValue", e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label={
                    isDocumentRequired
                      ? "Supporting Documents *"
                      : "Supporting Documents"
                  }
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required={isDocumentRequired}
                    onChange={(e) =>
                      setField("supportingDocument", e.target.files?.[0] || null)
                    }
                    className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold`}
                  />
                  {isDocumentRequired ? (
                    <p className="mt-1.5 text-xs font-medium text-amber-700">
                      Required for invoice value ₹50,000 or above
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">
                      Optional for invoice value below ₹50,000
                    </p>
                  )}
                </Field>
              </div>
            </Section>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <Section title="Quantity & Remarks">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Piece">
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.pieces}
                    onChange={(e) => setField("pieces", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={form.weight}
                    onChange={(e) => setField("weight", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Remarks">
                  <input
                    value={form.remarks}
                    onChange={(e) => setField("remarks", e.target.value)}
                    placeholder="Logistic issue / return reason"
                    className={inputClass}
                  />
                </Field>
              </div>
            </Section>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-[#1B2B4B] text-white text-sm font-bold disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-[22px] shadow-sm border border-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-[#1B2B4B]">Your Requests</h2>
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, AWB, or Status"
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-[#FAFBFC] border-b border-slate-100">
                <th className="px-4 py-4">Request</th>
                <th className="px-4 py-4">Original AWB</th>
                <th className="px-4 py-4">Pickup → Delivery</th>
                <th className="px-4 py-4">Item</th>
                <th className="px-4 py-4">Schedule</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">New AWB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No reverse pickup requests yet.
                    {canWrite && " Click New Request to get started."}
                  </td>
                </tr>
              ) : (
                requests.map((item) => {
                  const statusDisplay = getReversePickupStatusDisplay(item);
                  const awb = getReversePickupAwb(item);
                  const courier = getReversePickupCourier(item);

                  return (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/70 align-top cursor-pointer"
                    onClick={() => setSelectedRequest(item)}
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1B2B4B]">{item.requestId}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDisplayDate(item.requestDate || item.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-600">
                      {item.originalAwbNumber || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <ReversePickupRouteCell
                        fromName={item.fromName}
                        fromCity={item.fromCity}
                        fromPincode={item.fromPincode}
                        toName={item.toName}
                        toCity={item.toCity}
                        toPincode={item.toPincode}
                      />
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.itemDescription || "—"}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.pieces || 1} pc · {item.weight || 0} kg
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                      {formatDisplayDate(item.livePickupDate || item.pickupDate)}
                      <span className="text-slate-400">
                        {" "}
                        · {item.livePickupTime || item.pickupTime}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${getReversePickupStatusClass(statusDisplay)}`}
                      >
                        {statusDisplay.label}
                      </span>
                      {item.rejectionReason && (
                        <p className="text-xs text-rose-500 mt-1">{item.rejectionReason}</p>
                      )}
                      {item.failureReason && (
                        <p className="text-xs text-rose-500 mt-1">{item.failureReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-bold text-indigo-600">{awb}</p>
                      {courier && (
                        <p className="text-xs text-slate-500 mt-0.5">{courier}</p>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center border-t border-slate-100 px-5 py-4 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg py-1.5 px-2.5"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-slate-400">
              Page {currentPage} of {totalPages} ({totalRequests} requests)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(page + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalRequests === 0}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-[#1B2B4B]">{selectedRequest.requestId}</h3>
                <p className="text-xs text-slate-400">Reverse pickup details</p>
              </div>
              <button type="button" className="text-slate-500" onClick={() => setSelectedRequest(null)}>Close</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-slate-400">Status:</span> {selectedRequest.status}</p>
              <p><span className="text-slate-400">AWB:</span> {selectedRequest.awbNumber || selectedRequest.liveAwbNumber || "—"}</p>
              <p><span className="text-slate-400">Courier:</span> {selectedRequest.courierName || "—"}</p>
              <p><span className="text-slate-400">Requested pickup:</span> {formatDisplayDate(selectedRequest.requestedPickupDate || selectedRequest.pickupDate)}</p>
              <p><span className="text-slate-400">From:</span> {selectedRequest.fromName} · {selectedRequest.fromPhone}<br />{selectedRequest.fromAddress}, {selectedRequest.fromCity} {selectedRequest.fromPincode}</p>
              <p><span className="text-slate-400">To:</span> {selectedRequest.toName} · {selectedRequest.toPhone}<br />{selectedRequest.toAddress}, {selectedRequest.toCity} {selectedRequest.toPincode}</p>
              <p className="sm:col-span-2"><span className="text-slate-400">Items:</span> {selectedRequest.itemDescription} ({selectedRequest.pieces} pc, {selectedRequest.weight} kg)</p>
              <p><span className="text-slate-400">Invoice value:</span> ₹{selectedRequest.invoiceValue || 0}</p>
              <p><span className="text-slate-400">Payment:</span> {selectedRequest.paymentMethod || "—"}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Documents</h4>
              <div className="flex flex-wrap gap-2">
                {(selectedRequest.supportingDocumentName || selectedRequest.supportingDocumentPath || selectedRequest.supportingDocumentS3Key) && (
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold text-indigo-600"
                    onClick={async () => {
                      try {
                        const url = await getReversePickupDocumentUrl(selectedRequest._id);
                        window.open(url, "_blank", "noopener,noreferrer");
                      } catch (error) {
                        toast.error(error.message);
                      }
                    }}
                  >
                    Open supporting document
                  </button>
                )}
                {(selectedRequest.orderId?.documents || []).map((doc, index) => (
                  <span key={`${doc.fileName}-${index}`} className="px-3 py-1.5 rounded-lg border text-xs">
                    {doc.documentType || "Document"}: {doc.fileName || `File ${index + 1}`}
                  </span>
                ))}
                {!selectedRequest.supportingDocumentName && !(selectedRequest.orderId?.documents || []).length && (
                  <p className="text-xs text-slate-400">No documents attached</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReversePickupPage;
