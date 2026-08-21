import { useEffect, useMemo, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  Package,
  User,
  MapPin,
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { toast } from '../utils/toast';
import { createOrder, getNextOrderId, getOrderIdSequences } from "../api/ordersAPI";
import { getProducts } from "../api/productsAPI";
import { todayISODateOnly } from "../utils/dateTime";

const EMPTY_ITEM = {
  name: "",
  sku: "",
  units: 1,
  selling_price: 0,
  discount: 0,
  tax: 0,
  hsn: "",
};

const getItemLineTotal = (item = {}) => {
  const qty = Number(item.units || 1);
  const price = Number(item.selling_price || 0);
  const discount = Number(item.discount || 0);
  const tax = Number(item.tax || 0);
  const taxable = price * qty - discount;
  const gst = taxable * (tax / 100);
  return taxable + gst;
};

const calculateItemsSubTotal = (items = []) =>
  Number(items.reduce((sum, item) => sum + getItemLineTotal(item), 0).toFixed(2));

const calculateInvoiceValue = ({
  orderItems = [],
  shippingCharges = 0,
  giftwrapCharges = 0,
  transactionCharges = 0,
}) =>
  Number(
    (
      calculateItemsSubTotal(orderItems) +
      Number(shippingCharges || 0) +
      Number(giftwrapCharges || 0) +
      Number(transactionCharges || 0)
    ).toFixed(2)
  );

const VOLUMETRIC_DIVISOR = 4000;
const HIGH_VALUE_INVOICE_THRESHOLD = 50000;

const DOCUMENT_TYPE_OPTIONS = [
  { value: "INVOICE", label: "Invoice" },
  { value: "EWAYBILL", label: "E-Way Bill" },
  { value: "DELIVERY_CHALLAN", label: "Delivery Challan" },
  { value: "OTHER", label: "Other" },
];

const calculateVolumetricWeight = (length, breadth, height) => {
  const l = Number(length) || 0;
  const b = Number(breadth) || 0;
  const h = Number(height) || 0;
  if (l > 0 && b > 0 && h > 0) {
    return Number(((l * b * h) / VOLUMETRIC_DIVISOR).toFixed(3));
  }
  return 0;
};

const calculateChargeableWeight = (actualWeight, length, breadth, height) => {
  const actual = Number(actualWeight) || 0;
  const volumetric = calculateVolumetricWeight(length, breadth, height);
  if (volumetric > 0) {
    return Number(Math.max(actual, volumetric).toFixed(3));
  }
  return Number(actual.toFixed(3));
};

const resolveDefaultSequence = (user, isAdmin, companiesList, selectedCompanyId) => {
  const company = resolveCompanyForForm(user, isAdmin, companiesList, selectedCompanyId);

  if (
    company?.defaultOrderIdSequence === "numeric" ||
    company?.defaultOrderIdSequence === "alphanumeric"
  ) {
    return company.defaultOrderIdSequence;
  }

  return "alphanumeric";
};

const isCompanySequenceLocked = (user, isAdmin, companiesList, selectedCompanyId) => {
  const company = resolveCompanyForForm(user, isAdmin, companiesList, selectedCompanyId);
  return Boolean(company?.orderIdSequenceLocked);
};

const resolveActiveCompanyId = (form, isAdmin, user, defaultCompanyId) => {
  if (isAdmin) {
    return form.company_id && form.company_id !== "ALL"
      ? form.company_id
      : defaultCompanyId !== "ALL"
        ? defaultCompanyId
        : "";
  }
  return user?.companyID || "";
};

const formatCompanyAddress = (source = {}) => {
  if (!source || typeof source !== "object") return "";

  const line1 = String(source.address || "").trim();
  const cityState = [source.city, source.state]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  const pincode = String(source.zip_code || source.zipCode || "").trim();

  return [line1, cityState, pincode].filter(Boolean).join(", ");
};

const normalizeName = (value) => String(value || "").trim().toLowerCase();

const resolveConsignorPhone = (company, consignorName) => {
  if (!company) return "";

  const target = normalizeName(consignorName);
  const contacts = Array.isArray(company.consignorContacts)
    ? company.consignorContacts
    : [];

  if (target) {
    const matchedContact = contacts.find(
      (contact) =>
        normalizeName(contact.name) === target ||
        normalizeName(contact.companyName) === target
    );

    if (matchedContact?.phone) {
      return String(matchedContact.phone).trim();
    }
  }

  if (company.consignorPhone) {
    return String(company.consignorPhone).trim();
  }

  if (company.owner?.mobile_number) {
    return String(company.owner.mobile_number).trim();
  }

  return "";
};

const resolveConsignorDefaults = (company, user, isAdmin = false) => {
  const consignorName =
    String(company?.consignorName || company?.companyName || "").trim() ||
    (!isAdmin ? String(user?.companyName || "").trim() : "");

  let consignor_phone = resolveConsignorPhone(company, consignorName);

  if (!consignor_phone && !isAdmin && user?.mobile_number) {
    consignor_phone = String(user.mobile_number).trim();
  }

  return {
    consignor_name: consignorName,
    consignor_phone,
  };
};

const normalizeCompanyId = (companyId) => {
  const value = String(companyId || "").trim();
  return value && value !== "ALL" ? value : "";
};

const resolveCompanyForForm = (user, isAdmin, companiesList, selectedCompanyId) => {
  const companyId = normalizeCompanyId(selectedCompanyId);

  if (isAdmin && companyId) {
    return companiesList.find((item) => item.companyID === companyId) || null;
  }

  if (user?.company) {
    return user.company;
  }

  return {
    companyName: user?.companyName || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zip_code: user?.zip_code || "",
    country: user?.country || "India",
    consignorPhone: user?.mobile_number || "",
  };
};

const buildDefaultForm = (user, isAdmin, companiesList, selectedCompanyId) => {
  const companyId = isAdmin
    ? normalizeCompanyId(selectedCompanyId)
    : user?.companyID || "";
  const company = resolveCompanyForForm(user, isAdmin, companiesList, companyId);
  const pickupLocation = formatCompanyAddress(company);
  const orderIdSequence = resolveDefaultSequence(
    user,
    isAdmin,
    companiesList,
    companyId
  );
  const consignorDefaults = resolveConsignorDefaults(company, user, isAdmin);

  return {
    order_id: "",
    order_id_mode: "auto",
    order_id_sequence: orderIdSequence,
    order_date: todayISODateOnly(),
    company_id: companyId,
    consignor_name: consignorDefaults.consignor_name,
    consignor_phone: consignorDefaults.consignor_phone,
    pickup_location: pickupLocation,
    billing_customer_name: "",
    billing_last_name: "",
    billing_phone: "",
    billing_email: "",
    billing_address: "",
    billing_address_2: "",
    billing_city: "",
    billing_state: "",
    billing_pincode: "",
    billing_country: "India",
    payment_method: "COD",
    comment: "",
    invoice_no: "",
    invoice_value: "",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    weight: 0,
    length: 0,
    breadth: 0,
    height: 0,
    no_of_boxes: 1,
    order_items: [{ ...EMPTY_ITEM }],
  };
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const labelClass = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5";

const CreateOrderDialog = ({
  open,
  onClose,
  user,
  isAdmin,
  companiesList = [],
  defaultCompanyId = "ALL",
  onSuccess,
}) => {
  const [form, setForm] = useState(() =>
    buildDefaultForm(user, isAdmin, companiesList, defaultCompanyId)
  );
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sequences, setSequences] = useState([]);
  const [loadingOrderId, setLoadingOrderId] = useState(false);
  const [sequenceLocked, setSequenceLocked] = useState(false);
  const [orderDocuments, setOrderDocuments] = useState([]);
  const [pendingDocumentType, setPendingDocumentType] = useState("INVOICE");

  const activeCompanyId = useMemo(
    () => resolveActiveCompanyId(form, isAdmin, user, defaultCompanyId),
    [form.company_id, isAdmin, user, defaultCompanyId]
  );

  const fetchNextOrderId = async (sequence, companyId) => {
    if (!companyId) {
      setForm((prev) => ({ ...prev, order_id: "" }));
      setSequenceLocked(false);
      return;
    }

    try {
      setLoadingOrderId(true);
      const response = await getNextOrderId({
        sequence: sequence || form.order_id_sequence,
        companyId,
      });
      setForm((prev) => ({
        ...prev,
        order_id: response.orderId || "",
        order_id_sequence: response.sequenceType || prev.order_id_sequence,
      }));
      setSequenceLocked(Boolean(response.sequenceLocked));
    } catch (error) {
      toast.error(error.message || "Failed to load next order ID");
    } finally {
      setLoadingOrderId(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    getOrderIdSequences()
      .then((response) => {
        if (response.success) {
          setSequences(response.sequences || []);
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setForm(buildDefaultForm(user, isAdmin, companiesList, defaultCompanyId));
    setSuccessMessage("");
    setProductSearch("");
    setOrderDocuments([]);
    setPendingDocumentType("INVOICE");
    setSequenceLocked(
      isCompanySequenceLocked(user, isAdmin, companiesList, defaultCompanyId)
    );
  }, [open, user, isAdmin, companiesList, defaultCompanyId]);

  useEffect(() => {
    if (!open || form.order_id_mode !== "auto") return;
    fetchNextOrderId(form.order_id_sequence, activeCompanyId);
  }, [
    open,
    form.order_id_mode,
    form.order_id_sequence,
    activeCompanyId,
  ]);

  useEffect(() => {
    if (!open) return undefined;

    const loadProducts = async () => {
      try {
        const companyId =
          isAdmin && form.company_id && form.company_id !== "ALL"
            ? form.company_id
            : user?.companyID;

        const res = await getProducts({
          search: productSearch || undefined,
          companyId,
        });

        if (res.success) {
          setProducts(res.products || []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [open, productSearch, form.company_id, isAdmin, user?.companyID]);

  const subTotal = useMemo(
    () => calculateItemsSubTotal(form.order_items),
    [form.order_items]
  );

  const invoiceValue = useMemo(
    () =>
      calculateInvoiceValue({
        orderItems: form.order_items,
        shippingCharges: form.shipping_charges,
        giftwrapCharges: form.giftwrap_charges,
        transactionCharges: form.transaction_charges,
      }),
    [
      form.order_items,
      form.shipping_charges,
      form.giftwrap_charges,
      form.transaction_charges,
    ]
  );

  const effectiveInvoiceValue = useMemo(() => {
    const manual = String(form.invoice_value ?? "").trim();
    if (manual !== "" && Number.isFinite(Number(manual))) {
      return Number(manual);
    }
    return invoiceValue;
  }, [form.invoice_value, invoiceValue]);

  const volumetricWeight = useMemo(
    () =>
      calculateVolumetricWeight(form.length, form.breadth, form.height),
    [form.length, form.breadth, form.height]
  );

  const chargeableWeight = useMemo(
    () =>
      calculateChargeableWeight(
        form.weight,
        form.length,
        form.breadth,
        form.height
      ),
    [form.weight, form.length, form.breadth, form.height]
  );

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateItem = (index, key, value) => {
    setForm((prev) => {
      const order_items = [...prev.order_items];
      order_items[index] = { ...order_items[index], [key]: value };
      return { ...prev, order_items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      order_items: [...prev.order_items, { ...EMPTY_ITEM }],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      order_items: prev.order_items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleDocumentSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOrderDocuments((prev) => [
      ...prev,
      { file, documentType: pendingDocumentType },
    ]);
    event.target.value = "";
  };

  const removeDocument = (index) => {
    setOrderDocuments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const addProductToItems = (product) => {
    setForm((prev) => ({
      ...prev,
      order_items: [
        ...prev.order_items,
        {
          name: product.name || "",
          sku: product.sku || "",
          units: product.defaultUnits || 1,
          selling_price: product.sellingPrice || 0,
          discount: product.discount || 0,
          tax: product.tax || 0,
          hsn: product.hsn || "",
        },
      ],
      weight:
        Number(prev.weight || 0) +
        Number(product.weight || 0) * Number(product.defaultUnits || 1),
      length: Math.max(Number(prev.length || 0), Number(product.length || 0)),
      breadth: Math.max(Number(prev.breadth || 0), Number(product.breadth || 0)),
      height:
        Number(prev.height || 0) +
        Number(product.height || 0) * Number(product.defaultUnits || 1),
    }));
    toast.success(`${product.name} added to order`);
  };

  const handleCompanyChange = (companyId) => {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const company = companiesList.find(
      (item) => item.companyID === normalizedCompanyId
    );
    const sequence = resolveDefaultSequence(
      user,
      isAdmin,
      companiesList,
      normalizedCompanyId
    );
    const consignorDefaults = resolveConsignorDefaults(company, user, isAdmin);

    setSequenceLocked(Boolean(company?.orderIdSequenceLocked));
    setForm((prev) => ({
      ...prev,
      company_id: normalizedCompanyId,
      consignor_name: consignorDefaults.consignor_name,
      consignor_phone: consignorDefaults.consignor_phone,
      pickup_location: formatCompanyAddress(company),
      order_id_sequence: sequence,
    }));
  };

  const handleConsignorNameChange = (consignorName) => {
    const company = companiesList.find((item) => item.companyID === form.company_id);

    setForm((prev) => ({
      ...prev,
      consignor_name: consignorName,
      consignor_phone: resolveConsignorPhone(company, consignorName),
    }));
  };

  const handleSequenceChange = (sequence) => {
    if (sequenceLocked) return;
    setForm((prev) => ({
      ...prev,
      order_id_sequence: sequence,
    }));
  };

  const validateForm = () => {
    if (isAdmin && !normalizeCompanyId(form.company_id)) {
      toast.validation("Please select a company");
      return false;
    }
    if (form.order_id_mode === "manual" && !form.order_id.trim()) {
      toast.validation("Order ID is required");
      return false;
    }
    if (form.order_id_mode === "auto" && isAdmin && !activeCompanyId) {
      toast.validation("Please select a company before creating an order");
      return false;
    }
    if (!form.pickup_location.trim()) {
      toast.validation("Pickup location is required");
      return false;
    }
    if (!form.billing_customer_name.trim()) {
      toast.validation("Customer name is required");
      return false;
    }
    if (!form.billing_address.trim()) {
      toast.validation("Customer address is required");
      return false;
    }
    if (!form.billing_city.trim() || !form.billing_state.trim()) {
      toast.validation("Customer city and state are required");
      return false;
    }
    if (!/^\d{6}$/.test(String(form.billing_pincode || "").trim())) {
      toast.validation("Enter a valid 6-digit pincode");
      return false;
    }
    if (
      effectiveInvoiceValue >= HIGH_VALUE_INVOICE_THRESHOLD &&
      !orderDocuments.some((doc) =>
        ["INVOICE", "EWAYBILL"].includes(doc.documentType)
      )
    ) {
      toast.validation(
        "Orders with invoice value ≥ ₹50,000 require an Invoice or E-Way Bill document"
      );
      return false;
    }
    const boxes = Number(form.no_of_boxes);
    if (form.no_of_boxes !== "" && form.no_of_boxes !== undefined && (!Number.isFinite(boxes) || boxes <= 0)) {
      toast.validation("No. of Boxes must be a valid positive number");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setSuccessMessage("");

      const payload = {
        ...form,
        order_id_mode: form.order_id_mode,
        order_id_sequence: form.order_id_sequence,
        pickup_location: form.pickup_location.trim(),
        invoice_no: form.invoice_no.trim(),
        order_items: form.order_items.map((item) => ({
          name: item.name.trim(),
          sku: item.sku.trim(),
          units: Number(item.units) || 1,
          selling_price: Number(item.selling_price) || 0,
          discount: Number(item.discount) || 0,
          tax: Number(item.tax) || 0,
          hsn: String(item.hsn || ""),
        })),
        weight: Number(form.weight) || 0,
        length: Number(form.length) || 0,
        breadth: Number(form.breadth) || 0,
        height: Number(form.height) || 0,
        no_of_boxes: Number(form.no_of_boxes) > 0 ? Number(form.no_of_boxes) : 1,
        shipping_charges: Number(form.shipping_charges) || 0,
        giftwrap_charges: Number(form.giftwrap_charges) || 0,
        transaction_charges: Number(form.transaction_charges) || 0,
      };

      if (String(form.invoice_value).trim() !== "") {
        payload.invoice_value = Number(form.invoice_value);
      }

      if (!isAdmin) {
        delete payload.company_id;
      }

      if (form.order_id_mode === "auto") {
        delete payload.order_id;
      } else {
        payload.order_id = form.order_id.trim();
        delete payload.order_id_sequence;
      }

      const response = await createOrder(payload, { documents: orderDocuments });
      setSuccessMessage(`Order ${response.order_id} created successfully`);
      toast.success(`Order ${response.order_id} created`);
      onSuccess?.();

      if (form.order_id_mode === "auto") {
        setSequenceLocked(true);
      }

      const nextForm = buildDefaultForm(
        user,
        isAdmin,
        companiesList,
        form.company_id || defaultCompanyId
      );
      setForm(nextForm);
      setOrderDocuments([]);
      if (nextForm.order_id_mode === "auto") {
        fetchNextOrderId(
          nextForm.order_id_sequence,
          resolveActiveCompanyId(nextForm, isAdmin, user, defaultCompanyId)
        );
      }
    } catch (error) {
      toast.error(error.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-600" />
              <h2 className="text-xl font-bold text-[#1B2B4B]">Create Order</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Smart order form with catalog shortcuts, live totals, and auto-filled company details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close create order dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={18} />
                {successMessage}
              </div>
            )}

            <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1B2B4B]">
                <Package size={16} />
                Order Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Order ID Generation</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, order_id_mode: "auto" }))
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-semibold border ${
                        form.order_id_mode === "auto"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Auto-generate
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          order_id_mode: "manual",
                          order_id: "",
                        }))
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-semibold border ${
                        form.order_id_mode === "manual"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Manual entry
                    </button>
                  </div>
                </div>

                {form.order_id_mode === "auto" && (
                  <div className="md:col-span-2">
                    <label className={labelClass}>Order ID Generation Sequence</label>
                    <select
                      value={form.order_id_sequence}
                      onChange={(e) => handleSequenceChange(e.target.value)}
                      disabled={sequenceLocked}
                      className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
                    >
                      {(sequences.length
                        ? sequences
                        : [
                            {
                              id: "numeric",
                              label: "Numeric",
                              description: "Example: 100001, 100002, 100003",
                            },
                            {
                              id: "alphanumeric",
                              label: "Alphanumeric",
                              description: "Example: ORD100001, ORD100002, ORD100003",
                            },
                          ]
                      ).map((sequence) => (
                        <option key={sequence.id} value={sequence.id}>
                          {sequence.label} — {sequence.description || sequence.example}
                        </option>
                      ))}
                    </select>
                    {sequenceLocked ? (
                      <p className="mt-2 text-xs text-slate-500">
                        This company&apos;s order ID format is fixed and cannot be changed
                        after the first auto-generated order.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        Choose the format for this company. It will be locked after the first
                        auto-generated order.
                      </p>
                    )}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    {form.order_id_mode === "auto" ? "Next Order ID" : "Order ID *"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      required={form.order_id_mode === "manual"}
                      value={form.order_id}
                      readOnly={form.order_id_mode === "auto"}
                      onChange={(e) => updateField("order_id", e.target.value)}
                      placeholder={
                        form.order_id_mode === "auto"
                          ? isAdmin && !activeCompanyId
                            ? "Select a company to preview the next order ID"
                            : "Loading next order ID..."
                          : "Enter a unique order ID"
                      }
                      className={`${inputClass} ${
                        form.order_id_mode === "auto" ? "bg-slate-50" : ""
                      }`}
                    />
                    {form.order_id_mode === "auto" && (
                      <button
                        type="button"
                        onClick={() =>
                          fetchNextOrderId(form.order_id_sequence, activeCompanyId)
                        }
                        disabled={loadingOrderId || !activeCompanyId}
                        className="shrink-0 rounded-xl border border-slate-200 px-3 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        title="Refresh next order ID preview"
                      >
                        <RefreshCw
                          size={16}
                          className={loadingOrderId ? "animate-spin" : ""}
                        />
                      </button>
                    )}
                  </div>
                  {form.order_id_mode === "auto" && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Order IDs are generated on the server using a global sequence for the
                      selected format. Your company&apos;s format is locked after the first
                      auto-generated order.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Order Date</label>
                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => updateField("order_date", e.target.value)}
                    className={inputClass}
                  />
                </div>

                {isAdmin && (
                  <div className="md:col-span-2">
                    <label className={labelClass}>Company</label>
                    <select
                      value={form.company_id}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select company</option>
                      {companiesList.map((company) => (
                        <option key={company.companyID} value={company.companyID}>
                          {company.companyName} ({company.companyID})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Consignor Name</label>
                  <input
                    value={form.consignor_name}
                    onChange={(e) => handleConsignorNameChange(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Consignor Phone</label>
                  <input
                    value={form.consignor_phone}
                    onChange={(e) => updateField("consignor_phone", e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {isAdmin
                      ? "Prefilled from the selected company and consignor name. You can edit this before creating the order."
                      : "Prefilled from your account. You can edit this before creating the order."}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Pickup Location *</label>
                  <input
                    required
                    value={form.pickup_location}
                    onChange={(e) => updateField("pickup_location", e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Prefilled from company address. You can edit this before creating the order.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1B2B4B]">
                <User size={16} />
                Customer Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="First name *"
                  value={form.billing_customer_name}
                  onChange={(e) => updateField("billing_customer_name", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Last name"
                  value={form.billing_last_name}
                  onChange={(e) => updateField("billing_last_name", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Phone no."
                  value={form.billing_phone}
                  onChange={(e) => updateField("billing_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className={inputClass}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.billing_email}
                  onChange={(e) => updateField("billing_email", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Address *"
                  value={form.billing_address}
                  onChange={(e) => updateField("billing_address", e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                />
                <input
                  placeholder="Address line 2"
                  value={form.billing_address_2}
                  onChange={(e) => updateField("billing_address_2", e.target.value)}
                  className={`${inputClass} md:col-span-2`}
                />
                <input
                  placeholder="City *"
                  value={form.billing_city}
                  onChange={(e) => updateField("billing_city", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="State *"
                  value={form.billing_state}
                  onChange={(e) => updateField("billing_state", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Pincode *"
                  value={form.billing_pincode}
                  onChange={(e) => updateField("billing_pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={inputClass}
                />
                <select
                  value={form.payment_method}
                  onChange={(e) => updateField("payment_method", e.target.value)}
                  className={inputClass}
                >
                  <option value="COD">COD</option>
                  <option value="Prepaid">Prepaid</option>
                </select>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1B2B4B]">
                  <Package size={16} />
                  Order Items
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              </div>

              <div>
                <label className={labelClass}>Quick add from catalog</label>
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU"
                  className={inputClass}
                />
                {products.length > 0 && productSearch.trim() && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                    {products.slice(0, 8).map((product) => (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => addProductToItems(product)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-3"
                      >
                        <span className="font-semibold text-slate-700">{product.name}</span>
                        <span className="text-xs text-slate-400">{product.sku || "No SKU"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {form.order_items.map((item, index) => (
                  <div
                    key={`order-item-${index}`}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3"
                  >
                    <input
                      placeholder="Product name"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className={`${inputClass} md:col-span-3`}
                    />
                    <input
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => updateItem(index, "sku", e.target.value)}
                      className={`${inputClass} md:col-span-2`}
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.units}
                      onChange={(e) => updateItem(index, "units", e.target.value)}
                      className={`${inputClass} md:col-span-1`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.selling_price}
                      onChange={(e) => updateItem(index, "selling_price", e.target.value)}
                      className={`${inputClass} md:col-span-2`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Discount"
                      value={item.discount}
                      onChange={(e) => updateItem(index, "discount", e.target.value)}
                      className={`${inputClass} md:col-span-1`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Tax %"
                      value={item.tax}
                      onChange={(e) => updateItem(index, "tax", e.target.value)}
                      className={`${inputClass} md:col-span-1`}
                    />
                    <input
                      placeholder="HSN"
                      value={item.hsn}
                      onChange={(e) => updateItem(index, "hsn", e.target.value)}
                      className={`${inputClass} md:col-span-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="md:col-span-1 inline-flex items-center justify-center rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1B2B4B]">
                <FileText size={16} />
                Invoice Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Invoice No (optional)"
                  value={form.invoice_no}
                  onChange={(e) => updateField("invoice_no", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Invoice Value (optional — auto-calculated from the product price if left blank)"
                  value={form.invoice_value}
                  onChange={(e) => updateField("invoice_value", e.target.value)}
                  className={inputClass}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1B2B4B]">
                <Upload size={16} />
                Order Documents
              </div>
              <p className="text-xs text-slate-500">
                Upload supporting documents. Orders with invoice value ≥ ₹50,000 require an Invoice or E-Way Bill.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px]">
                  <label className={labelClass}>Document Type</label>
                  <select
                    value={pendingDocumentType}
                    onChange={(e) => setPendingDocumentType(e.target.value)}
                    className={inputClass}
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-2.5 text-sm font-semibold text-indigo-700 cursor-pointer hover:bg-indigo-50">
                  <Upload size={16} />
                  Add Document
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleDocumentSelect}
                  />
                </label>
              </div>
              {orderDocuments.length > 0 && (
                <div className="space-y-2">
                  {orderDocuments.map((doc, index) => (
                    <div
                      key={`${doc.file.name}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{doc.file.name}</p>
                        <p className="text-xs text-slate-500">
                          {DOCUMENT_TYPE_OPTIONS.find((option) => option.value === doc.documentType)?.label || doc.documentType}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="rounded-lg border border-rose-200 px-2 py-1 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1B2B4B]">
                <MapPin size={16} />
                Package & Charges
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Weight (kg)"
                  value={form.weight}
                  onChange={(e) => updateField("weight", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="No. of Boxes"
                  value={form.no_of_boxes}
                  onChange={(e) => updateField("no_of_boxes", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Length (cm)"
                  value={form.length}
                  onChange={(e) => updateField("length", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Breadth (cm)"
                  value={form.breadth}
                  onChange={(e) => updateField("breadth", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Height (cm)"
                  value={form.height}
                  onChange={(e) => updateField("height", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Shipping charges"
                  value={form.shipping_charges}
                  onChange={(e) => updateField("shipping_charges", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Gift wrap"
                  value={form.giftwrap_charges}
                  onChange={(e) => updateField("giftwrap_charges", e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Transaction charges"
                  value={form.transaction_charges}
                  onChange={(e) => updateField("transaction_charges", e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Comment"
                  value={form.comment}
                  onChange={(e) => updateField("comment", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <span>Actual: <strong>{Number(form.weight || 0).toFixed(3)} kg</strong></span>
                <span>Volumetric: <strong>{volumetricWeight.toFixed(3)} kg</strong></span>
                <span>Chargeable: <strong className="text-indigo-700">{chargeableWeight.toFixed(3)} kg</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[#1B2B4B] text-white px-4 py-3 text-sm">
                <span>Subtotal: ₹{subTotal.toLocaleString("en-IN")}</span>
                <span className="opacity-60">|</span>
                <span className="font-bold">Invoice Value: ₹{effectiveInvoiceValue.toLocaleString("en-IN")}</span>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              <Plus size={16} />
              {submitting ? "Creating Order..." : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderDialog;
