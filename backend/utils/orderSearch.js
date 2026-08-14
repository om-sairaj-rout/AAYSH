const mongoose = require("mongoose");
const Shipping = require("../models/upload/shipping.model");
const { parseISTDate, startOfDayIST, endOfDayIST } = require("./dateTime");

const parseSearchDateRange = (term) => {
  const trimmed = String(term || "").trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = parseISTDate(trimmed);
    if (parsed) {
      return { $gte: startOfDayIST(parsed), $lte: endOfDayIST(parsed) };
    }
  }

  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const parsed = parseISTDate(`${year}-${month}-${day}`);
    if (parsed) {
      return { $gte: startOfDayIST(parsed), $lte: endOfDayIST(parsed) };
    }
  }

  return null;
};

const normalizeSearchType = (searchType) => {
  const type = String(searchType || "").trim().toLowerCase();

  if (["order_id", "orderid", "order-id"].includes(type)) {
    return "order_id";
  }
  if (type === "phone") return "phone";
  if (["customer", "customer_name", "name"].includes(type)) {
    return "customer";
  }
  if (type === "awb") return "awb";

  return "";
};

const applyTypedOrderSearch = async (orderFilter, term, searchType) => {
  const searchRegex = { $regex: term, $options: "i" };

  switch (searchType) {
    case "order_id": {
      const orConditions = [{ externalOrderId: searchRegex }];

      if (mongoose.Types.ObjectId.isValid(term)) {
        orConditions.push({
          _id: new mongoose.Types.ObjectId(term),
        });
      }

      orderFilter.$or = orConditions;
      return;
    }

    case "phone": {
      orderFilter.$or = [
        { billingPhone: searchRegex },
        { billingAlternatePhone: searchRegex },
      ];
      return;
    }

    case "customer": {
      orderFilter.$or = [
        { consigneeName: searchRegex },
        { consigneeLastName: searchRegex },
      ];
      return;
    }

    case "awb": {
      const shippingOrders = await Shipping.find({
        awbNumber: searchRegex,
      })
        .select("orderId")
        .lean();

      if (shippingOrders.length === 0) {
        orderFilter._id = { $in: [] };
        return;
      }

      orderFilter._id = {
        $in: shippingOrders.map((entry) => entry.orderId),
      };
      return;
    }

    default:
      break;
  }
};

const applyLegacyOrderSearch = async (orderFilter, raw) => {
  if (raw.startsWith("#")) {
    const orderIdTerm = raw.slice(1).trim();
    if (!orderIdTerm) return;

    await applyTypedOrderSearch(orderFilter, orderIdTerm, "order_id");
    return;
  }

  const dateRange = parseSearchDateRange(raw);
  if (dateRange) {
    if (!orderFilter.orderDate) {
      orderFilter.orderDate = dateRange;
    }
    return;
  }

  if (/^\d{10}$/.test(raw)) {
    await applyTypedOrderSearch(orderFilter, raw, "phone");
    return;
  }

  if (/[a-zA-Z]/.test(raw)) {
    await applyTypedOrderSearch(orderFilter, raw, "customer");
    return;
  }

  const searchRegex = { $regex: raw, $options: "i" };
  const shippingOrders = await Shipping.find({
    awbNumber: searchRegex,
  })
    .select("orderId")
    .lean();

  const orConditions = [{ externalOrderId: searchRegex }];

  if (shippingOrders.length > 0) {
    orConditions.push({
      _id: { $in: shippingOrders.map((entry) => entry.orderId) },
    });
  }

  orderFilter.$or = orConditions;
};

const applyOrderSearchFilter = async (orderFilter, search, searchType) => {
  const raw = String(search || "").trim();
  if (!raw || raw === "#") return;

  const normalizedType = normalizeSearchType(searchType);
  const term = raw.startsWith("#") ? raw.slice(1).trim() : raw;

  if (!term) return;

  if (normalizedType) {
    await applyTypedOrderSearch(orderFilter, term, normalizedType);
    return;
  }

  await applyLegacyOrderSearch(orderFilter, raw);
};

module.exports = {
  applyOrderSearchFilter,
  parseSearchDateRange,
  normalizeSearchType,
};
