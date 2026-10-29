const Shipping = require("../../models/upload/shipping.model");
const { parseISODateOnly } = require("../../utils/dateTime");
const { assignAwbCore } = require("../../utils/assignAwbCore");

const mapCoreRowToShipmentResult = (row, shipmentId) => {
  if (row.error) {
    return {
      shipmentId,
      orderId: row.orderNumber || row.orderId,
      consigneeName: row.consigneeName,
      destinationPincode: row.destinationPincode,
      error: row.error,
    };
  }

  return {
    shipmentId,
    orderId: row.orderId,
    consigneeName: row.consigneeName,
    destinationPincode: row.destinationPincode,
    awbNumber: row.awbNumber,
    courier: row.courier,
    serviceType: row.serviceType,
    category: row.category,
  };
};

const findCoreRowForOrder = (rows, orderId) => {
  const key = String(orderId);
  return rows.find(
    (row) =>
      String(row.mongoOrderId || "") === key ||
      String(row.orderId || "") === key
  );
};

const generateAwbExternal = async (req, res) => {
  try {
    const {
      serviceType,
      shipments,
      pickupDate,
      pickupLocation,
      pickupTime,
      notes,
    } = req.body;

    const service = serviceType?.toLowerCase();

    if (
      !service ||
      !Array.isArray(shipments) ||
      shipments.length === 0 ||
      !pickupDate ||
      !pickupTime ||
      !pickupLocation
    ) {
      return res.status(400).json({
        success: false,
        message:
          "serviceType, shipments, pickupDate, pickupTime and pickupLocation are required.",
      });
    }

    if (!["surface", "air", "prime"].includes(service)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type.",
      });
    }

    if (!parseISODateOnly(pickupDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickupDate. Expected format YYYY-MM-DD.",
      });
    }

    const shippingDocs = await Shipping.find({
      shipmentId: { $in: shipments },
    })
      .select("shipmentId orderId awbNumber")
      .lean();

    const shippingMap = new Map(
      shippingDocs.map((s) => [s.shipmentId, s])
    );

    const updatedShipments = [];
    const ordersForCore = [];

    for (const shipmentId of shipments) {
      const shipping = shippingMap.get(shipmentId);

      if (!shipping) {
        updatedShipments.push({
          shipmentId,
          error: "Shipment not found",
        });
        continue;
      }

      if (shipping.awbNumber) {
        updatedShipments.push({
          shipmentId,
          orderId: shipping.orderId,
          error: "AWB already assigned",
        });
        continue;
      }

      ordersForCore.push({
        shipmentId,
        orderId: shipping.orderId,
      });
    }

    if (ordersForCore.length) {
      const result = await assignAwbCore({
        serviceType,
        orders: ordersForCore.map(({ orderId }) => ({ orderId })),
        pickupDate,
        pickupLocation,
        pickupTime,
        notes,
      });

      const coreRows = result.data || [];

      for (const item of ordersForCore) {
        const row = findCoreRowForOrder(coreRows, item.orderId);
        if (!row) {
          updatedShipments.push({
            shipmentId: item.shipmentId,
            error: "Assignment failed",
          });
          continue;
        }
        updatedShipments.push(
          mapCoreRowToShipmentResult(row, item.shipmentId)
        );
      }
    }

    const successCount = updatedShipments.filter((o) => o.awbNumber).length;

    if (!successCount) {
      return res.status(400).json({
        success: false,
        message: "No shipments could be assigned.",
        data: updatedShipments,
      });
    }

    const failedCount = updatedShipments.filter((o) => o.error).length;

    return res.status(200).json({
      success: successCount > 0,
      message: "AWB assignment completed",
      summary: {
        total: updatedShipments.length,
        success: successCount,
        failed: failedCount,
      },
      data: updatedShipments,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Server error during AWB assignment",
    });
  }
};

module.exports = generateAwbExternal;
