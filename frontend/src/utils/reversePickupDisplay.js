const REQUEST_STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  awb_assigned: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

const SHIPPING_STATUS_STYLES = {
  Pending: "bg-slate-50 text-slate-600 border-slate-200",
  Booked: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Shipped: "bg-sky-50 text-sky-700 border-sky-200",
  "In Transit": "bg-violet-50 text-violet-700 border-violet-200",
  "Out For Delivery": "bg-purple-50 text-purple-700 border-purple-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  RTO: "bg-orange-50 text-orange-700 border-orange-200",
  Returned: "bg-orange-50 text-orange-700 border-orange-200",
  Exchange: "bg-teal-50 text-teal-700 border-teal-200",
  Delayed: "bg-amber-50 text-amber-700 border-amber-200",
  "Delivery Attempt Failed": "bg-rose-50 text-rose-700 border-rose-200",
};

const PICKUP_STATUS_STYLES = {
  Pending: "bg-slate-50 text-slate-600 border-slate-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Failed: "bg-rose-50 text-rose-700 border-rose-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export const getReversePickupStatusDisplay = (item) => {
  const requestStatus = item?.status || "pending";

  if (requestStatus === "pending") {
    return {
      label: "Pending Approval",
      styleKey: "pending",
      kind: "request",
    };
  }

  if (requestStatus === "rejected") {
    return {
      label: "Rejected",
      styleKey: "rejected",
      kind: "request",
    };
  }

  if (requestStatus === "failed") {
    return {
      label: "Failed",
      styleKey: "failed",
      kind: "request",
    };
  }

  const shippingStatus = String(item?.shippingStatus || "").trim();
  if (shippingStatus && shippingStatus !== "Pending") {
    return {
      label: shippingStatus,
      styleKey: shippingStatus,
      kind: "shipping",
    };
  }

  const pickupStatus = String(item?.pickupStatus || "").trim();
  if (pickupStatus && pickupStatus !== "Pending") {
    return {
      label: `Pickup ${pickupStatus}`,
      styleKey: pickupStatus,
      kind: "pickup",
    };
  }

  if (requestStatus === "awb_assigned") {
    return {
      label: "AWB Assigned",
      styleKey: "awb_assigned",
      kind: "request",
    };
  }

  return {
    label: requestStatus.replace(/_/g, " "),
    styleKey: requestStatus,
    kind: "request",
  };
};

export const getReversePickupStatusClass = (display) => {
  if (!display) return REQUEST_STATUS_STYLES.pending;

  if (display.kind === "shipping") {
    return SHIPPING_STATUS_STYLES[display.styleKey] || REQUEST_STATUS_STYLES.awb_assigned;
  }

  if (display.kind === "pickup") {
    return PICKUP_STATUS_STYLES[display.styleKey] || REQUEST_STATUS_STYLES.awb_assigned;
  }

  return REQUEST_STATUS_STYLES[display.styleKey] || REQUEST_STATUS_STYLES.pending;
};

export const getReversePickupAwb = (item) =>
  String(item?.awbNumber || "").trim() || "—";

export const getReversePickupCourier = (item) =>
  String(item?.courierName || "").trim();
