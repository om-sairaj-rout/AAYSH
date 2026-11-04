const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const { toISTDateTime, toISTDate } = require("../../utils/dateTime");
const { userOwnsOrder } = require("../../utils/companyScope");

const getExternalShipmentById = async (req, res) => {
  try {
    const shipmentId = String(req.params.shipmentId || "").trim();

    if (!shipmentId) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const shipping = await Shipping.findOne({ shipmentId }).lean();

    if (!shipping) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const order = await Order.findById(shipping.orderId).lean();

    if (!order || !userOwnsOrder(order, req)) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        shipment_id: shipping.shipmentId,
        order_id: order.externalOrderId,
        customer: {
          name: `${order.consigneeName} ${order.consigneeLastName}`.trim(),
          email: order.consigneeEmail,
          phone: order.billingPhone,
          alternate_phone: order.billingAlternatePhone,
        },
        shipping_address: {
          address: order.address,
          address2: order.address2,
          city: order.destinationCity,
          state: order.destinationState,
          pincode: order.destinationPincode,
          country: order.destinationCountry,
        },
        products: (order.orderItems || []).map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.units,
          selling_price: item.sellingPrice,
          discount: item.discount,
          tax: item.tax,
          hsn: item.hsn,
        })),
        awb: shipping.awbNumber || "",
        courier: shipping.courierName || "",
        pickup_location: shipping.pickupLocation || "",
        payment_method: order.paymentMethod,
        status: shipping.shippingStatus || "Pending",
        shipping_charges: shipping.shippingCharges || 0,
        delivery_attempts: shipping.deliveryAttempts || 0,
        attempt_failure_reason: shipping.attemptFailureReason || "",
        package: {
          weight: order.weight,
          length: order.length,
          breadth: order.breadth,
          height: order.height,
        },
        created_at: toISTDateTime(shipping.createdAt),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = getExternalShipmentById;
