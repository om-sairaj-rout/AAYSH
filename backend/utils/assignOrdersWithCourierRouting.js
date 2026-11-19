const Order = require("../models/upload/order.model");
const { assignAwbCore } = require("./assignAwbCore");
const { assignDelhiveryCodOrders } = require("./assignDelhiveryCodOrders");

const splitOrdersByCourier = async (ordersPayload = []) => {
  const orderIds = ordersPayload.map((o) => o.orderId).filter(Boolean);
  const orderDocs = await Order.find({ _id: { $in: orderIds } })
    .select("_id paymentMethod isReversePickup")
    .lean();
  const orderMap = new Map(orderDocs.map((o) => [String(o._id), o]));

  const trackon = [];
  const delhiveryCod = [];

  for (const item of ordersPayload) {
    const order = orderMap.get(String(item.orderId));
    if (!order) {
      trackon.push(item);
      continue;
    }

    const payment = String(order.paymentMethod || "").toUpperCase();
    if (payment === "COD" && !order.isReversePickup) {
      delhiveryCod.push(item);
    } else {
      trackon.push(item);
    }
  }

  return { trackon, delhiveryCod };
};

const mergeAssignResults = (trackonResult, delhiveryResult) => {
  const data = [
    ...(trackonResult?.data || []),
    ...(delhiveryResult?.data || []),
  ];

  const summary = {
    total: data.length,
    success:
      (trackonResult?.summary?.success || 0) +
      (delhiveryResult?.summary?.success || 0),
    failed:
      (trackonResult?.summary?.failed || 0) +
      (delhiveryResult?.summary?.failed || 0),
  };

  const success = summary.success > 0;

  let message = "AWB assignment completed";
  if (summary.success > 0 && summary.failed > 0) {
    message = "Partial AWB assignment completed";
  } else if (!success) {
    message = trackonResult?.message || delhiveryResult?.message || "No orders could be assigned.";
  }

  return {
    success,
    message,
    data,
    summary,
    routing: {
      trackon: trackonResult?.summary || null,
      delhivery: delhiveryResult?.summary || null,
    },
  };
};

const assignOrdersWithCourierRouting = async (
  {
    serviceType,
    orders = [],
    pickupDate,
    pickupLocation,
    pickupTime,
    notes,
    delhiveryPickupLocationId,
    shipmentType,
    packagesByOrder,
    mpsPackages,
  },
  user
) => {
  const { trackon, delhiveryCod } = await splitOrdersByCourier(orders);

  let trackonResult = null;
  if (trackon.length) {
    trackonResult = await assignAwbCore({
      serviceType,
      orders: trackon,
      pickupDate,
      pickupLocation,
      pickupTime,
      notes,
    });
  }

  let delhiveryResult = null;
  if (delhiveryCod.length) {
    const packagesByOrderResolved = { ...(packagesByOrder || {}) };

    delhiveryResult = await assignDelhiveryCodOrders(
      {
        serviceType,
        orders: delhiveryCod.map((item) => ({
          ...item,
          packages:
            item.packages ||
            packagesByOrderResolved[String(item.orderId)] ||
            null,
        })),
        pickupDate,
        pickupTime,
        notes,
        delhiveryPickupLocationId,
        shipmentType,
        packagesByOrder: packagesByOrderResolved,
      },
      user
    );
  }

  if (!trackonResult && delhiveryResult) {
    return delhiveryResult;
  }
  if (trackonResult && !delhiveryResult) {
    return trackonResult;
  }

  return mergeAssignResults(trackonResult, delhiveryResult);
};

module.exports = {
  assignOrdersWithCourierRouting,
  splitOrdersByCourier,
};
