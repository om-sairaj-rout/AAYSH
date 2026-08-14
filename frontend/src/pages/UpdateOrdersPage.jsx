import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Calendar,
  User,
  Copy,
  Edit3,
  ArrowLeft,
  X,
  Package,
  AlertCircle,
  CheckCircle,
  Phone,
  MapPin,
} from "lucide-react";
import { getAllUsers } from "../api/authAPI";
import { getOrdersByUser, updateOrder } from "../api/ordersAPI";
import {
  formatDisplayDate,
  toDateInputValue,
  startOfDayIST,
  endOfDayIST,
} from "../utils/dateTime";

const calculateItemsSubTotal = (orderItems = []) => {
  const itemsTotal = orderItems.reduce((sum, item) => {
    const qty = Number(item.units) || 0;
    const price = Number(item.selling_price) || 0;
    const discount = Number(item.discount) || 0;
    const tax = Number(item.tax) || 0;
    const taxable = price * qty - discount;
    return sum + taxable + taxable * (tax / 100);
  }, 0);

  return Number(itemsTotal.toFixed(2));
};

const calculateInvoiceValue = (formData) =>
  Number(
    (
      calculateItemsSubTotal(formData.order_items || []) +
      Number(formData.shipping_charges || 0) +
      Number(formData.giftwrap_charges || 0) +
      Number(formData.transaction_charges || 0)
    ).toFixed(2)
  );

const buildUpdatePayload = (formData) => ({
  order_id: formData.order_id,
  order_date: formData.order_date || undefined,
  pickup_location: formData.pickup_location,
  comment: formData.comment,

  billing_customer_name: formData.billing_customer_name,
  billing_last_name: formData.billing_last_name,
  billing_address: formData.billing_address,
  billing_address_2: formData.billing_address_2,
  billing_city: formData.billing_city,
  billing_state: formData.billing_state,
  billing_country: formData.billing_country,
  billing_pincode: formData.billing_pincode,
  billing_email: formData.billing_email,
  billing_phone: formData.billing_phone,
  billing_alternate_phone: formData.billing_alternate_phone,

  payment_method: formData.payment_method,

  shipping_charges: Number(formData.shipping_charges || 0),
  giftwrap_charges: Number(formData.giftwrap_charges || 0),
  transaction_charges: Number(formData.transaction_charges || 0),
  total_discount: Number(formData.total_discount || 0),

  weight: Number(formData.weight || 0),
  length: Number(formData.length || 0),
  breadth: Number(formData.breadth || 0),
  height: Number(formData.height || 0),

  order_items: (formData.order_items || []).map((item) => ({
    name: item.name?.trim(),
    sku: item.sku?.trim() || "",
    units: Number(item.units) || 1,
    selling_price: Number(item.selling_price) || 0,
    discount: Number(item.discount) || 0,
    tax: Number(item.tax) || 0,
    hsn: item.hsn?.trim() || "",
  })),
});

const UpdateOrdersPage = () => {
  // State Management
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Modal & Form State
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const previewSubTotal = useMemo(
    () => calculateItemsSubTotal(formData.order_items || []),
    [formData.order_items]
  );

  const previewInvoiceValue = useMemo(
    () => calculateInvoiceValue(formData),
    [formData]
  );

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
  
      try {
        const data = await getAllUsers();
  
        if (!data.success) {
          throw new Error(data.message || "Failed to fetch users");
        }
  
        setUsers(data.users || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
  
        setMessage({
          type: "error",
          text: err.message || "Failed to load users",
        });
      } finally {
        setLoading(false);
      }
    };
  
    fetchUsers();
  }, []);

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setOrders([]);
    setLoading(true);
    setMessage({ type: "", text: "" });
  
    try {
      const data = await getOrdersByUser(user._id);
  
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch orders");
      }
  
      setOrders(data.orders || []);
  
    } catch (err) {
      console.error("Failed to fetch user orders:", err);
  
      setMessage({
        type: "error",
        text: err.message || "Failed to load orders",
      });
  
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal with Pre-filled Form
  const handleOpenEditModal = (order) => {
    setEditingOrder(order);
    setFormData({
      order_id: order.externalOrderId,
    
      order_date: order.orderDate
        ? toDateInputValue(order.orderDate)
        : "",
    
      pickup_location: order.shipping?.pickupLocation || "",
      comment: order.comment || "",
    
      billing_customer_name: order.consigneeName || "",
      billing_last_name: order.consigneeLastName || "",
    
      billing_address: order.address || "",
      billing_address_2: order.address2 || "",
    
      billing_city: order.destinationCity || "",
      billing_state: order.destinationState || "",
      billing_country: order.destinationCountry || "India",
      billing_pincode: order.destinationPincode || "",
    
      billing_email: order.consigneeEmail || "",
      billing_phone: order.billingPhone || "",
      billing_alternate_phone: order.billingAlternatePhone || "",
    
      payment_method: order.paymentMethod || "COD",
    
      sub_total: calculateItemsSubTotal(
        order.orderItems?.map((item) => ({
          units: item.units ?? 1,
          selling_price: item.sellingPrice ?? 0,
          discount: item.discount ?? 0,
          tax: item.tax ?? 0,
        })) || []
      ),
      shipping_charges: order.shippingCharges ?? 0,
      giftwrap_charges: order.giftwrapCharges ?? 0,
      transaction_charges: order.transactionCharges ?? 0,
      total_discount: order.totalDiscount ?? 0,
    
      weight: order.weight ?? 0,
      length: order.length ?? 0,
      breadth: order.breadth ?? 0,
      height: order.height ?? 0,
    
      order_items: order.orderItems
        ? order.orderItems.map((item) => ({
            name: item.name || "",
            sku: item.sku || "",
            units: item.units ?? 1,
            selling_price: item.sellingPrice ?? 0,
            discount: item.discount ?? 0,
            tax: item.tax ?? 0,
            hsn: item.hsn || "",
          }))
        : [],
    });
  };

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Item Changes
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.order_items];
    updatedItems[index][field] = value;
    const nextSubTotal = calculateItemsSubTotal(updatedItems);
    setFormData((prev) => ({
      ...prev,
      order_items: updatedItems,
      sub_total: nextSubTotal,
    }));
  };

  // Submit Updated Order to Backend Controller
  const handleSubmitUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!formData.order_items?.length) {
      setMessage({
        type: "error",
        text: "Order must contain at least one item.",
      });
      return;
    }

    const hasInvalidItem = formData.order_items.some(
      (item) => !item.name?.trim() || Number(item.units) < 1
    );

    if (hasInvalidItem) {
      setMessage({
        type: "error",
        text: "Each item needs a name and at least 1 unit.",
      });
      return;
    }

    const payload = buildUpdatePayload(formData);

    try {
      setIsSubmitting(true);
      const data = await updateOrder(payload);

      if (data.success) {
        setMessage({
          type: "success",
          text: "Order updated successfully!",
        });

        setOrders((prev) =>
          prev.map((o) =>
            o.externalOrderId === formData.order_id
              ? {
                  ...o,
                  orderDate: formData.order_date,
                  comment: formData.comment,
                  invoiceValue: data.invoice_value ?? o.invoiceValue,
                  subTotal: data.sub_total ?? previewSubTotal,
                  shipping: {
                    ...(o.shipping || {}),
                    pickupLocation: formData.pickup_location,
                    shippingCharges: Number(formData.shipping_charges),
                    totalWeight: Number(formData.weight),
                  },
  
                  consigneeName: formData.billing_customer_name,
                  consigneeLastName: formData.billing_last_name,
  
                  address: formData.billing_address,
                  address2: formData.billing_address_2,
  
                  destinationCity: formData.billing_city,
                  destinationState: formData.billing_state,
                  destinationCountry: formData.billing_country,
                  destinationPincode: formData.billing_pincode,
  
                  consigneeEmail: formData.billing_email,
                  billingPhone: formData.billing_phone,
                  billingAlternatePhone:
                    formData.billing_alternate_phone,
  
                  paymentMethod: formData.payment_method,

                  shippingCharges: Number(formData.shipping_charges),
                  giftwrapCharges: Number(formData.giftwrap_charges),
                  transactionCharges: Number(
                    formData.transaction_charges
                  ),
                  totalDiscount: Number(formData.total_discount),
  
                  weight: Number(formData.weight),
                  length: Number(formData.length),
                  breadth: Number(formData.breadth),
                  height: Number(formData.height),
  
                  orderItems: formData.order_items?.map((item) => ({
                    name: item.name,
                    sku: item.sku,
                    units: Number(item.units),
                    sellingPrice: Number(item.selling_price),
                    discount: Number(item.discount),
                    tax: Number(item.tax),
                    hsn: item.hsn,
                  })),
                }
              : o
          )
        );
  
        setTimeout(() => {
          setEditingOrder(null);
        }, 1200);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to update order.",
        });
      }
    } catch (err) {
      console.error("Update order failed:", err);

      setMessage({
        type: "error",
        text: err.message || "Server error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      o.externalOrderId?.toLowerCase().includes(q) ||
      o.consigneeName?.toLowerCase().includes(q) ||
      o.billingPhone?.includes(q) ||
      o.shipping?.awbNumber?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (fromDate || toDate) {
      if (!o.orderDate) return false;

      const orderTime = startOfDayIST(o.orderDate)?.getTime();
      if (fromDate) {
        const fromTime = startOfDayIST(fromDate)?.getTime();
        if (orderTime < fromTime) return false;
      }
      if (toDate) {
        const toTime = endOfDayIST(toDate)?.getTime();
        if (orderTime > toTime) return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      {/* SECTION 1: ACCOUNT MANAGEMENT VIEW */}
      {!selectedUser ? (
        <div className="max-w-5xl mx-auto mt-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Order Update Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Select an active user file profile to perform order updates.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 font-medium">
              Loading user accounts...
            </div>
          ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className="flex items-center justify-between p-5 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <User size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {u.companyName}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      u.role === "admin"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      ) : (
        /* SECTION 2: USER ORDERS VIEW */
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header & Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedUser(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm transition"
            >
              <ArrowLeft size={16} /> Back to Users
            </button>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Selected Account
              </span>
              <h2 className="text-lg font-bold text-slate-800">{selectedUser.companyName}</h2>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200/80 p-3 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[280px] relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Order ID, Customer, Phone, SKU, AWB..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl">
                <span>From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent focus:outline-none text-slate-700"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl">
                <span>To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent focus:outline-none text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider font-semibold">
                  <tr>
                    <th className="p-4 w-8">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </th>
                    <th className="p-4">Order ID & Info</th>
                    <th className="p-4">Order Items</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">AWB No.</th>
                    <th className="p-4 text-center">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                        const shippingStatus = order.shipping?.shippingStatus || "Not Shipped";

                        const isEditable = true;
                      return (
                        <tr key={order.externalOrderId} className="hover:bg-slate-50/50 transition">
                          <td className="p-4">
                            <input type="checkbox" className="rounded border-slate-300" />
                          </td>

                          {/* Order ID & Info */}
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm">
                                #{order.externalOrderId}
                              </span>
                              <button
                                onClick={() => copyToClipboard(order.externalOrderId)}
                                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-md text-[10px] flex items-center gap-1"
                              >
                                <Copy size={11} /> Copy
                              </button>
                            </div>
                            <div className="text-slate-500 space-y-0.5 font-medium">
                            <p className="flex items-center gap-1">
  <Calendar size={12} className="text-slate-400" /> Order Date:{" "}
  {formatDisplayDate(order.orderDate)}
</p>
<p className="flex items-center gap-1">
  <Package size={12} className="text-slate-400" /> Pickup Date:{" "}
  <span className="text-indigo-600 font-semibold">
    {formatDisplayDate(order.shipping?.pickupDate)}
  </span>
</p>
                              <p className="flex items-center gap-1">
                                Payment:{" "}
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                  {order.paymentMethod}
                                </span>
                              </p>
                            </div>
                          </td>

                          {/* Order Items */}
                          <td className="p-4 space-y-1 max-w-[200px]">
                            {order.orderItems?.map((item, idx) => (
                              <div key={idx} className="font-medium text-slate-800 truncate">
                                {item.name} <span className="text-slate-400">(x{item.units})</span>
                              </div>
                            ))}
                            <p className="text-slate-400 font-medium">
                              Weight: <span className="text-slate-600">{order.weight} kg</span>
                            </p>
                          </td>

                          {/* Customer Details */}
                          <td className="p-4 space-y-1 max-w-[260px]">
                            <p className="font-bold text-slate-900 uppercase">{order.consigneeName}</p>
                            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                              <Phone size={12} className="text-pink-500" />
                              <span>{order.billingPhone}</span>
                              <button
                                onClick={() => copyToClipboard(order.billingPhone)}
                                className="text-slate-400 hover:text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]"
                              >
                                Copy
                              </button>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-start gap-1.5 mt-1 text-[11px] text-slate-600">
                              <MapPin size={13} className="text-pink-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2 uppercase">
                                {order.address}, {order.destinationCity}
                              </span>
                              <button
                                onClick={() => copyToClipboard(order.address)}
                                className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] ml-auto shrink-0"
                              >
                                Copy
                              </button>
                            </div>
                          </td>

                          {/* AWB No */}
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-indigo-900">{order.shipping?.awbNumber || "-"}</span>
                              {order.shipping?.awbNumber && (
                                <button
                                  onClick={() => copyToClipboard(order.shipping.awbNumber)}
                                  className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded text-[10px]"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                              {order.shipping?.courierName || "-"}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center space-y-2">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                                shippingStatus === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : shippingStatus === "In Transit"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {shippingStatus}
                            </span>

                            <div>
                              <button
                                onClick={() => handleOpenEditModal(order)}
                                className={`mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition ${
                                  isEditable
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <Edit3 size={12} /> Edit Order
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: EDIT ORDER MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Update Order #{formData.order_id}
                </h3>
                <p className="text-xs text-slate-400">
                  Status: <span className="font-semibold text-amber-600">{editingOrder.shipping?.shippingStatus || "Not Shipped"}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitUpdate} className="p-6 space-y-6">
              {message.text && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {message.text}
                </div>
              )}

              {/* Order Details */}
<div>
  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
    Order Details
  </h4>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

    <div>
      <label className="block text-slate-600 font-medium mb-1">
        Order Date
      </label>

      <input
        type="date"
        name="order_date"
        value={formData.order_date || ""}
        onChange={handleChange}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
      />
    </div>

    <div>
      <label className="block text-slate-600 font-medium mb-1">
        Pickup Location
      </label>

      <input
        type="text"
        name="pickup_location"
        value={formData.pickup_location || ""}
        onChange={handleChange}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
      />
    </div>

    <div className="sm:col-span-2">
      <label className="block text-slate-600 font-medium mb-1">
        Comment
      </label>

      <textarea
        name="comment"
        value={formData.comment || ""}
        onChange={handleChange}
        rows={2}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
      />
    </div>

  </div>
</div>

              {/* Customer & Billing Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Customer & Shipping Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">First Name</label>
                    <input
                      type="text"
                      name="billing_customer_name"
                      value={formData.billing_customer_name}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Last Name</label>
                    <input
                      type="text"
                      name="billing_last_name"
                      value={formData.billing_last_name}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">Address Line 1</label>
                    <input
                      type="text"
                      name="billing_address"
                      value={formData.billing_address}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">Address Line 2</label>
                    <input
                      type="text"
                      name="billing_address_2"
                      value={formData.billing_address_2}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">City</label>
                    <input
                      type="text"
                      name="billing_city"
                      value={formData.billing_city}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">State</label>
                    <input
                      type="text"
                      name="billing_state"
                      value={formData.billing_state}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
  <label className="block text-slate-600 font-medium mb-1">
    Country
  </label>

  <input
    type="text"
    name="billing_country"
    value={formData.billing_country || ""}
    onChange={handleChange}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
  />
</div>
<div>
  <label className="block text-slate-600 font-medium mb-1">
    Email
  </label>

  <input
    type="email"
    name="billing_email"
    value={formData.billing_email || ""}
    onChange={handleChange}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
  />
</div>
<div>
  <label className="block text-slate-600 font-medium mb-1">
    Alternate Phone
  </label>

  <input
    type="text"
    name="billing_alternate_phone"
    value={formData.billing_alternate_phone || ""}
    onChange={handleChange}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
  />
</div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Pincode</label>
                    <input
                      type="text"
                      name="billing_pincode"
                      value={formData.billing_pincode}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      name="billing_phone"
                      value={formData.billing_phone}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Package & Logistics Dimensions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Package Dimensions & Pickup
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Length (cm)</label>
                    <input
                      type="number"
                      name="length"
                      value={formData.length}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Breadth (cm)</label>
                    <input
                      type="number"
                      name="breadth"
                      value={formData.breadth}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Height (cm)</label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment & Financials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Payment Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Payment Method</label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    >
                      <option value="COD">COD</option>
                      <option value="Prepaid">Prepaid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Sub Total (₹)</label>
                    <input
                      type="number"
                      name="sub_total"
                      value={previewSubTotal}
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-600 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Auto-calculated from order items (incl. tax)
                    </p>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Shipping Charges (₹)</label>
                    <input
                      type="number"
                      name="shipping_charges"
                      value={formData.shipping_charges}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
                    />
                  </div>
                  <div>
  <label className="block text-slate-600 font-medium mb-1">
    Gift Wrap Charges
  </label>

  <input
    type="number"
    name="giftwrap_charges"
    value={formData.giftwrap_charges ?? 0}
    onChange={handleChange}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
  />
</div>
<div>
  <label className="block text-slate-600 font-medium mb-1">
    Transaction Charges
  </label>

  <input
    type="number"
    name="transaction_charges"
    value={formData.transaction_charges ?? 0}
    onChange={handleChange}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
  />
</div>
<div>
  <label className="block text-slate-600 font-medium mb-1">
    Total Discount
  </label>

  <input
    type="number"
    name="total_discount"
    value={formData.total_discount ?? 0}
    onChange={handleChange}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500"
  />
</div>
                </div>
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Estimated Invoice Value
                  </span>
                  <span className="text-sm font-black text-indigo-700">
                    ₹{previewInvoiceValue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Order Items
                </h4>
                {formData.order_items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2"
                  >
                    <div className="sm:col-span-2">
                      <label className="block text-slate-500 text-[10px]">Item Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px]">SKU</label>
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleItemChange(idx, "sku", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px]">Units</label>
                      <input
                        type="number"
                        value={item.units}
                        onChange={(e) => handleItemChange(idx, "units", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px]">Selling Price</label>
                      <input
                        type="number"
                        value={item.selling_price}
                        onChange={(e) => handleItemChange(idx, "selling_price", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5"
                      />
                    </div>
                    <div>
  <label className="block text-slate-500 text-[10px]">
    Discount
  </label>

  <input
    type="number"
    value={item.discount}
    onChange={(e) =>
      handleItemChange(idx, "discount", e.target.value)
    }
    className="w-full bg-white border border-slate-200 rounded-lg p-1.5"
  />
</div>
<div>
  <label className="block text-slate-500 text-[10px]">
    Tax
  </label>

  <input
    type="number"
    value={item.tax}
    onChange={(e) =>
      handleItemChange(idx, "tax", e.target.value)
    }
    className="w-full bg-white border border-slate-200 rounded-lg p-1.5"
  />
</div>
<div>
  <label className="block text-slate-500 text-[10px]">
    HSN
  </label>

  <input
    type="text"
    value={item.hsn}
    onChange={(e) =>
      handleItemChange(idx, "hsn", e.target.value)
    }
    className="w-full bg-white border border-slate-200 rounded-lg p-1.5"
  />
</div>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-md transition"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateOrdersPage;