const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");

const getShipmentDetails = async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const isAdmin = req.user.role === "admin";

    const shipment = await Shipping.findOne({
      shipmentId,
    }).lean();

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const orderFilter = {
      _id: shipment.orderId,
    };

    if (!isAdmin) {
      orderFilter.uploadedBy = req.user.id;
    }

    const order = await Order.findOne(orderFilter).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        shipment_id: shipment.shipmentId,

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

        products: order.orderItems.map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.units,
          selling_price: item.sellingPrice,
          discount: item.discount,
          tax: item.tax,
          hsn: item.hsn,
        })),

        awb: shipment.awbNumber,

        courier: shipment.courierName,

        pickup_location: shipment.pickupLocation,

        payment_method: order.paymentMethod,

        status: shipment.shippingStatus,

        shipping_charges: shipment.shippingCharges,

        delivery_attempts: shipment.deliveryAttempts,

        attempt_failure_reason:
          shipment.attemptFailureReason,

        package: {
          weight: order.weight,
          length: order.length,
          breadth: order.breadth,
          height: order.height,
        },

        created_at: shipment.createdAt,
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

module.exports = getShipmentDetails;