const PickupSchedule = require("../models/pickupSchedule.model");
const { assignAwbCore } = require("./assignAwbCore");
const {
  createOrderWithShipping,
  normalizeCreateOrderPayload,
  parseDocumentTypes,
} = require("./createOrderWithShipping");
const Shipping = require("../models/upload/shipping.model");
const Order = require("../models/upload/order.model");
const { parseISODateOnly, toISTDate } = require("./dateTime");

const mergeScheduleIntoOrderBody = (schedule, rawBody) => {
  const body = { ...rawBody };

  if (!body.pickup_location) {
    body.pickup_location = schedule.pickupLocation;
  }
  if (!body.weight && schedule.weight) {
    body.weight = schedule.weight;
  }
  if (!body.no_of_boxes) {
    body.no_of_boxes = 1;
  }
  if (!body.company_id) {
    body.company_id = schedule.companyID;
  }

  return body;
};

const splitFilesByOrder = (files = [], documentMeta = []) => {
  const byOrder = {};

  documentMeta.forEach((meta, index) => {
    const orderIndex = Number(meta?.orderIndex ?? 0);
    if (!byOrder[orderIndex]) {
      byOrder[orderIndex] = { files: [], documentTypes: [] };
    }
    const file = files[index];
    if (!file) return;
    byOrder[orderIndex].files.push(file);
    byOrder[orderIndex].documentTypes.push(
      meta.documentType || meta.type || "INVOICE"
    );
  });

  return byOrder;
};

const normalizeOrdersInput = ({ rawBody, files = [], documentTypes = [] }) => {
  if (Array.isArray(rawBody?.orders) && rawBody.orders.length > 0) {
    let documentMeta = [];
    try {
      const metaSource = rawBody.document_meta;
      if (Array.isArray(metaSource)) {
        documentMeta = metaSource;
      } else if (typeof metaSource === "string") {
        documentMeta = JSON.parse(metaSource);
      }
    } catch {
      documentMeta = [];
    }

    const filesByOrder = splitFilesByOrder(files, documentMeta);

    return rawBody.orders.map((orderBody, index) => ({
      rawBody: orderBody,
      files: filesByOrder[index]?.files || [],
      documentTypes: filesByOrder[index]?.documentTypes || [],
    }));
  }

  return [
    {
      rawBody,
      files,
      documentTypes,
    },
  ];
};

const completePickupScheduleFlow = async ({
  schedule,
  rawBody,
  user,
  files = [],
  documentTypes = [],
}) => {
  if (schedule.status !== "scheduled") {
    const error = new Error("Only scheduled pickups can be completed");
    error.statusCode = 400;
    throw error;
  }

  if (schedule.orderId || (schedule.orderIds && schedule.orderIds.length > 0)) {
    const error = new Error("This pickup schedule already has orders");
    error.statusCode = 409;
    throw error;
  }

  const ordersInput = normalizeOrdersInput({ rawBody, files, documentTypes });
  if (!ordersInput.length) {
    const error = new Error("At least one order is required to complete pickup");
    error.statusCode = 400;
    throw error;
  }

  const pickupDateStr =
    toISTDate(schedule.pickupDate) || String(schedule.pickupDate).slice(0, 10);
  const parsedPickupDate = parseISODateOnly(pickupDateStr);

  const created = [];

  const rollbackCreatedOrders = async () => {
    for (const row of created) {
      if (row.shipping?._id) {
        await Shipping.deleteOne({ _id: row.shipping._id });
      }
      if (row.order?._id) {
        await Order.deleteOne({ _id: row.order._id });
      }
    }
    created.length = 0;
  };

  try {
    for (const orderInput of ordersInput) {
      const mergedBody = mergeScheduleIntoOrderBody(schedule, orderInput.rawBody);
      mergedBody.order_id_mode = "auto";
      delete mergedBody.order_id;
      delete mergedBody.order_id_sequence;

      const { order, shipping } = await createOrderWithShipping({
        body: mergedBody,
        user,
        files: orderInput.files,
        documentTypes: orderInput.documentTypes,
        options: {
          isPickupFirst: true,
          pickupScheduleId: schedule._id,
          serviceType: schedule.preferredServiceType || "surface",
          companyID: schedule.companyID,
        },
      });

      if (parsedPickupDate) {
        await Shipping.updateOne(
          { _id: shipping._id },
          {
            $set: {
              pickupDate: parsedPickupDate,
              pickupTime: schedule.pickupTime || "11:00",
              pickupLocation: schedule.pickupLocation,
            },
          }
        );
      }

      created.push({ order, shipping });
    }
  } catch (error) {
    await rollbackCreatedOrders();
    throw error;
  }

  let awbResults = [];
  let awbFailureReason = "";

  try {
    const awbResult = await assignAwbCore({
      serviceType: schedule.preferredServiceType || "surface",
      orders: created.map(({ order }) => ({ orderId: order._id })),
      pickupDate: pickupDateStr,
      pickupLocation: schedule.pickupLocation,
      pickupTime: schedule.pickupTime || "11:00",
      notes: schedule.notes || "",
    });

    awbResults = Array.isArray(awbResult.data) ? awbResult.data : [];
    const successCount = awbResults.filter((row) => row.awbNumber).length;

    if (successCount < created.length) {
      const failed = awbResults.find((row) => row.error);
      awbFailureReason =
        failed?.error ||
        awbResult.message ||
        "Some orders could not be assigned AWB. Ship from All Orders when ready.";
    }
  } catch (error) {
    awbFailureReason =
      error.message ||
      "AWB assignment failed. Ship orders from All Orders when ready.";
  }

  const orderSummaries = [];

  for (const { order, shipping } of created) {
    const latestShipping = await Shipping.findById(shipping._id)
      .select("awbNumber courierName shipmentId")
      .lean();

    const awbRow = awbResults.find(
      (row) => String(row.mongoOrderId) === String(order._id)
    );

    orderSummaries.push({
      orderId: order._id,
      externalOrderId: order.externalOrderId,
      shipmentId: latestShipping?.shipmentId || shipping.shipmentId,
      awbNumber: latestShipping?.awbNumber || awbRow?.awbNumber || "",
      courierName: latestShipping?.courierName || awbRow?.courier || "",
      awbAssigned: Boolean(latestShipping?.awbNumber || awbRow?.awbNumber),
      awbFailureReason: awbRow?.error || "",
      noOfBoxes: order.noOfBoxes || 1,
    });
  }

  const allAwbAssigned = orderSummaries.every((row) => row.awbAssigned);
  const anyAwbAssigned = orderSummaries.some((row) => row.awbAssigned);

  schedule.orderIds = orderSummaries.map((row) => row.orderId);
  schedule.orderId = orderSummaries[0]?.orderId || null;
  schedule.externalOrderId = orderSummaries[0]?.externalOrderId || "";
  schedule.expectedOrderCount = ordersInput.length;
  schedule.completedOrders = orderSummaries.map((row) => ({
    orderId: row.orderId,
    externalOrderId: row.externalOrderId,
    shipmentId: row.shipmentId,
    awbNumber: row.awbNumber,
    courierName: row.courierName,
    awbAssigned: row.awbAssigned,
    awbFailureReason: row.awbFailureReason,
    noOfBoxes: row.noOfBoxes || 1,
  }));
  schedule.status = "completed";
  schedule.awbAssigned = allAwbAssigned || anyAwbAssigned;
  schedule.awbNumber = orderSummaries[0]?.awbNumber || "";
  schedule.courierName = orderSummaries[0]?.courierName || "";
  schedule.awbFailureReason = allAwbAssigned ? "" : awbFailureReason;
  schedule.completedBy = user?.id || null;
  schedule.completedAt = new Date();
  await schedule.save();

  return {
    schedule,
    orders: created.map((row, index) => ({
      order: row.order,
      shipping: row.shipping,
      summary: orderSummaries[index],
    })),
    awbAssigned: schedule.awbAssigned,
    awbFailureReason: schedule.awbFailureReason,
    orderSummaries,
  };
};

module.exports = {
  completePickupScheduleFlow,
  mergeScheduleIntoOrderBody,
  normalizeCreateOrderPayload,
  parseDocumentTypes,
  normalizeOrdersInput,
};
