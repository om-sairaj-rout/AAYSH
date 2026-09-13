const PickupSchedule = require("../models/pickupSchedule.model");
const Shipping = require("../models/upload/shipping.model");
const Order = require("../models/upload/order.model");
const Company = require("../models/company.model");
const User = require("../models/user.model");
const {
  buildScheduleTabMatch,
  formatPickupSchedule,
  formatCompanyAddress,
} = require("./pickupScheduleHelpers");

const buildCompanyMetaMap = async (companyIDs = []) => {
  const ids = [...new Set(companyIDs.filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;

  const [companies, owners] = await Promise.all([
    Company.find({ companyID: { $in: ids } }).lean(),
    User.find({ companyID: { $in: ids }, companyRole: "owner" }).lean(),
  ]);

  const ownerByCompany = new Map(
    owners.map((owner) => [owner.companyID, owner])
  );

  companies.forEach((company) => {
    const owner = ownerByCompany.get(company.companyID);
    map.set(company.companyID, {
      consignorName: String(company.companyName || "").trim(),
      consignorPhone: String(owner?.mobile_number || "").trim(),
      companyPickupAddress: formatCompanyAddress(company),
    });
  });

  ids.forEach((companyID) => {
    if (map.has(companyID)) return;
    const owner = ownerByCompany.get(companyID);
    if (!owner) return;

    map.set(companyID, {
      consignorName: String(owner.companyName || owner.fullName || "").trim(),
      consignorPhone: String(owner.mobile_number || "").trim(),
      companyPickupAddress: formatCompanyAddress(owner),
    });
  });

  return map;
};

const buildScheduleScopeForUser = (user) => {
  if (user?.companyID) {
    return { companyID: user.companyID };
  }
  const userId = user?.id || user?._id;
  if (userId) {
    return { scheduledBy: userId };
  }
  return {};
};

const resolveAdminScheduleCompanyFilter = async (userFilterId) => {
  if (!userFilterId) return {};
  const userDoc = await User.findById(userFilterId).select("companyID").lean();
  if (!userDoc?.companyID) {
    return { companyID: "__none__" };
  }
  return { companyID: userDoc.companyID };
};

const buildScheduleSearchFilter = (searchTerm) => {
  const term = String(searchTerm || "").trim();
  if (!term) return null;

  return {
    $or: [
      { scheduleId: { $regex: term, $options: "i" } },
      { pickupLocation: { $regex: term, $options: "i" } },
      { externalOrderId: { $regex: term, $options: "i" } },
      { notes: { $regex: term, $options: "i" } },
    ],
  };
};

const resolveScheduleOrderBoxes = (schedule, linkedOrders = []) => {
  const orders =
    linkedOrders.length > 0
      ? linkedOrders
      : schedule.orderId
      ? [{ _id: schedule.orderId, noOfBoxes: 1 }]
      : [];

  if (orders.length === 0) {
    const scheduledBoxes = schedule.noOfBoxes || 1;
    return {
      orderBoxCounts: [],
      hasMultipleOrders: false,
      linkedOrders: [],
      displayBoxes: scheduledBoxes,
      packagesCount: scheduledBoxes,
    };
  }

  const orderBoxCounts = orders.map((order) => order.noOfBoxes || 1);
  const hasMultipleOrders = orders.length > 1;

  return {
    orderBoxCounts,
    hasMultipleOrders,
    linkedOrders: orders.map((order) => ({
      orderId: String(order._id),
      externalOrderId: order.externalOrderId || "",
      noOfBoxes: order.noOfBoxes || 1,
    })),
    displayBoxes: hasMultipleOrders ? orderBoxCounts : orderBoxCounts[0] || 1,
    packagesCount: hasMultipleOrders
      ? orderBoxCounts
      : orderBoxCounts[0] || schedule.noOfBoxes || 1,
  };
};

const formatScheduleAsPickupRow = (
  schedule,
  linkedShipping = null,
  companyMeta = null,
  linkedOrders = [],
  shippingByOrderId = new Map()
) => {
  const formatted = formatPickupSchedule(schedule);
  let pickupStatus = "Scheduled";

  if (formatted.status === "completed") {
    pickupStatus = "Completed";
  } else if (formatted.status === "cancelled") {
    pickupStatus = "Cancelled";
  }

  const awbNumber =
    formatted.awbNumber || linkedShipping?.awbNumber || "";
  const courierName =
    formatted.courierName ||
    linkedShipping?.courierName ||
    (formatted.status === "scheduled"
      ? `Pickup-First (${formatted.preferredServiceType || "surface"})`
      : "");

  const boxInfo = resolveScheduleOrderBoxes(schedule, linkedOrders);
  const orderCount = Math.max(
    formatted.expectedOrderCount ||
      formatted.completedOrders?.length ||
      boxInfo.linkedOrders.length ||
      (formatted.orderId ? 1 : 0),
    1
  );
  const hasMultipleOrders = orderCount > 1;

  const completedOrders =
    Array.isArray(formatted.completedOrders) && formatted.completedOrders.length > 0
      ? formatted.completedOrders.map((row) => {
          const shipping =
            shippingByOrderId.get(String(row.orderId)) ||
            (linkedShipping && String(linkedShipping.orderId) === String(row.orderId)
              ? linkedShipping
              : null);
          return {
            ...row,
            awbNumber: row.awbNumber || shipping?.awbNumber || "",
            courierName: row.courierName || shipping?.courierName || "",
            awbAssigned:
              row.awbAssigned || Boolean(row.awbNumber || shipping?.awbNumber),
          };
        })
      : boxInfo.linkedOrders.map((row) => ({
          orderId: row.orderId,
          externalOrderId: row.externalOrderId,
          noOfBoxes: row.noOfBoxes || 1,
          awbNumber: "",
          courierName: "",
          awbAssigned: false,
        }));

  return {
    _id: formatted._id,
    scheduleId: formatted.scheduleId,
    orderId: formatted.orderId,
    externalOrderId: formatted.externalOrderId || "",
    orderCount,
    hasMultipleOrders,
    orderBoxCounts: boxInfo.orderBoxCounts,
    linkedOrders: boxInfo.linkedOrders,
    completedOrders,
    awbNumber,
    courierName,
    pickupLocation: formatted.pickupLocation,
    pickupDate: formatted.pickupDate,
    pickupTime: formatted.pickupTime || linkedShipping?.pickupTime || "",
    packagesCount: boxInfo.packagesCount,
    noOfBoxes: boxInfo.displayBoxes,
    pickupStatus,
    failureReason:
      formatted.status === "completed" && !formatted.awbAssigned
        ? formatted.awbFailureReason
        : "",
    isPickupSchedule: true,
    scheduleStatus: formatted.status,
    awbAssigned: formatted.awbAssigned || Boolean(awbNumber),
    preferredServiceType: formatted.preferredServiceType,
    weight: formatted.weight,
    notes: formatted.notes,
    companyID: formatted.companyID,
    consignorName: companyMeta?.consignorName || "",
    consignorPhone: companyMeta?.consignorPhone || "",
    companyPickupAddress: companyMeta?.companyPickupAddress || "",
  };
};

const listSchedulesForPickupTab = async ({
  tab,
  search,
  baseScope = {},
}) => {
  if (tab === "failed") {
    return [];
  }

  const filter = {
    ...baseScope,
    ...buildScheduleTabMatch(tab),
  };

  const searchFilter = buildScheduleSearchFilter(search);
  if (searchFilter) {
    filter.$and = filter.$and || [];
    filter.$and.push(searchFilter);
  }

  const items = await PickupSchedule.find(filter)
    .sort({ pickupDate: 1, createdAt: -1 })
    .lean();

  const visibleItems = items.filter((item) => {
    if (item.status !== "completed") return true;
    const orderCount =
      item.expectedOrderCount ||
      (Array.isArray(item.completedOrders) ? item.completedOrders.length : 0) ||
      (Array.isArray(item.orderIds) ? item.orderIds.length : 0) ||
      1;
    if (orderCount > 1) return true;
    return !(item.awbAssigned && item.awbNumber);
  });

  const scheduleIds = visibleItems.map((item) => item._id);
  const primaryOrderIds = visibleItems.flatMap((item) => {
    if (Array.isArray(item.orderIds) && item.orderIds.length > 0) {
      return item.orderIds;
    }
    return item.orderId ? [item.orderId] : [];
  });

  const linkedOrderDocs =
    scheduleIds.length > 0
      ? await Order.find({
          $or: [
            { pickupScheduleId: { $in: scheduleIds } },
            ...(primaryOrderIds.length > 0
              ? [{ _id: { $in: primaryOrderIds } }]
              : []),
          ],
        })
          .select("_id externalOrderId noOfBoxes pickupScheduleId")
          .lean()
      : [];

  const ordersByScheduleId = new Map();
  linkedOrderDocs.forEach((order) => {
    const scheduleKey = order.pickupScheduleId
      ? String(order.pickupScheduleId)
      : null;

    if (scheduleKey) {
      if (!ordersByScheduleId.has(scheduleKey)) {
        ordersByScheduleId.set(scheduleKey, []);
      }
      ordersByScheduleId.get(scheduleKey).push(order);
      return;
    }

    const parentSchedule = visibleItems.find(
      (item) => item.orderId && String(item.orderId) === String(order._id)
    );
    if (!parentSchedule) return;

    const parentKey = String(parentSchedule._id);
    if (!ordersByScheduleId.has(parentKey)) {
      ordersByScheduleId.set(parentKey, []);
    }
    ordersByScheduleId.get(parentKey).push(order);
  });

  const allOrderIds = linkedOrderDocs.map((order) => order._id);

  const shippingRows =
    allOrderIds.length > 0
      ? await Shipping.find({ orderId: { $in: allOrderIds } })
          .select("orderId awbNumber courierName pickupTime")
          .lean()
      : [];

  const shippingByOrderId = new Map(
    shippingRows.map((row) => [String(row.orderId), row])
  );

  const companyMetaMap = await buildCompanyMetaMap(
    visibleItems.map((item) => item.companyID)
  );

  return visibleItems.map((item) =>
    formatScheduleAsPickupRow(
      item,
      shippingByOrderId.get(String(item.orderId)),
      companyMetaMap.get(item.companyID),
      ordersByScheduleId.get(String(item._id)) || [],
      shippingByOrderId
    )
  );
};

const countSchedulesByPickupTabs = async (baseScope = {}) => {
  const tabs = [
    "today",
    "future",
    "failed",
    "cancelled",
    "completed",
    "scheduled",
    "all",
  ];
  const counts = {};

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab === "failed") {
        counts[tab] = 0;
        return;
      }
      const match = { ...baseScope, ...buildScheduleTabMatch(tab) };
      counts[tab] = await PickupSchedule.countDocuments(match);
    })
  );

  return counts;
};

const mergeAndPaginatePickups = (shipmentRows, scheduleRows, { skip, perPage }) => {
  const merged = [...shipmentRows, ...scheduleRows].sort((a, b) => {
    const dateA = new Date(a.pickupDate || 0).getTime();
    const dateB = new Date(b.pickupDate || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return String(a._id).localeCompare(String(b._id));
  });

  const total = merged.length;
  const data = merged.slice(skip, skip + perPage);
  return { data, total };
};

const addScheduleCounts = (shipmentCounts, scheduleCounts) => ({
  today: (shipmentCounts.today || 0) + (scheduleCounts.today || 0),
  future: (shipmentCounts.future || 0) + (scheduleCounts.future || 0),
  failed: (shipmentCounts.failed || 0) + (scheduleCounts.failed || 0),
  cancelled: (shipmentCounts.cancelled || 0) + (scheduleCounts.cancelled || 0),
  completed: (shipmentCounts.completed || 0) + (scheduleCounts.completed || 0),
  scheduled: (shipmentCounts.scheduled || 0) + (scheduleCounts.scheduled || 0),
  all: (shipmentCounts.all || 0) + (scheduleCounts.all || 0),
});

module.exports = {
  buildScheduleScopeForUser,
  resolveAdminScheduleCompanyFilter,
  listSchedulesForPickupTab,
  countSchedulesByPickupTabs,
  mergeAndPaginatePickups,
  addScheduleCounts,
  formatScheduleAsPickupRow,
};
