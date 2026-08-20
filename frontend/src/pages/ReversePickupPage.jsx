import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeftRight,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createReversePickup,
  getReversePickups,
} from "../api/reversePickupAPI";
import { getOrderByAwb } from "../api/ordersAPI";
import { getCompanyDetail } from "../api/companyAPI";
import { getProducts } from "../api/productsAPI";
import { canAccess } from "../utils/permissions";
import { formatDisplayDate, todayISODateOnly } from "../utils/dateTime";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  awb_assigned: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

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
  const canWrite = canAccess(user, "pickup", "write");

  const [form, setForm] = useState(() => buildEmptyForm(user));
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [awbLoading, setAwbLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const previewRequestNo = useMemo(
    () => `REV-RP-${Date.now().toString().slice(-8)}`,
    []
  );

  const invoiceValueNumber = Number(form.invoiceValue) || 0;
  const isDocumentRequired =
    invoiceValueNumber >= HIGH_VALUE_INVOICE_THRESHOLD;

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getReversePickups({ perPage: 50 });
      setRequests(res.requests || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

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
    loadRequests();
    loadCompanyDefaults();
    getProducts()
      .then((res) => setProducts(res.products || []))
      .catch(() => {});
  }, [loadCompanyDefaults]);

  const loadFromOriginalAwb = async () => {
    const awb = form.originalAwbNumber.trim();
    if (!awb) {
      toast.error("Enter the original shipment AWB number");
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
    <div className="w-full min-h-full bg-[#EFF2F6] -m-4 md:-m-6 p-5 md:p-8 space-y-6">
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
              description="Customer location — where the package will be collected from."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[#1B2B4B]">Your Requests</h2>
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
                requests.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70">
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
                      <p className="font-medium text-[#1B2B4B]">
                        {item.fromName}{" "}
                        <span className="text-slate-400">({item.fromPincode})</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        → {item.toName} ({item.toPincode})
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.itemDescription || "—"}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.pieces || 1} pc · {item.weight || 0} kg
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                      {formatDisplayDate(item.pickupDate)}
                      <span className="text-slate-400"> · {item.pickupTime}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[item.status] || ""}`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                      {item.rejectionReason && (
                        <p className="text-xs text-rose-500 mt-1">{item.rejectionReason}</p>
                      )}
                      {item.failureReason && (
                        <p className="text-xs text-rose-500 mt-1">{item.failureReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-indigo-600">
                      {item.awbNumber || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReversePickupPage;
