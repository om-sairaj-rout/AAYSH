const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { toISTDateTime, toISTDate } = require("../../utils/dateTime");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");

const getSpecificOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const isAdmin = req.user.role === "admin";

    const filter = applyCompanyOrderFilter(req, {
      externalOrderId: orderId,
    });

    const order = await Order.findOne(filter).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const shipping = await Shipping.findOne({
      orderId: order._id,
    }).lean();

    return res.status(200).json({
      success: true,

      data: {
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

        payment_method: order.paymentMethod,

        order_date: toISTDate(order.orderDate),

        pickup_date: toISTDate(shipping?.pickupDate),

        comment: order.comment,

        package: {
          weight: order.weight,
          length: order.length,
          breadth: order.breadth,
          height: order.height,
        },

        products: order.orderItems.map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.units,
          selling_price: item.sellingPrice,
          discount: item.discount,
          tax: item.tax,
          hsn: item.hsn,
        })),

        shipment: {
          shipment_id: shipping?.shipmentId || "",
          awb: shipping?.awbNumber || "",
          courier: shipping?.courierName || "",
          pickup_location: shipping?.pickupLocation || "",
          status: shipping?.shippingStatus || "Pending",
          shipping_charges: shipping?.shippingCharges || 0,
          delivery_attempts: shipping?.deliveryAttempts || 0,
          attempt_failure_reason:
            shipping?.attemptFailureReason || "",
        },

        created_at: toISTDateTime(order.createdAt),
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

module.exports = getSpecificOrder;