const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");
const { toISTDateTime, toISTDate } = require("../../utils/dateTime");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");

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

    const orderFilter = applyCompanyOrderFilter(req, {
      _id: shipment.orderId,
    });

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

        products: (order.orderItems || []).map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.units,
          selling_price: item.sellingPrice,
          discount: item.discount,
          tax: item.tax,
          hsn: item.hsn,
        })),

        invoice_no: order.invoiceNo,
        invoice_value: order.invoiceValue,

        company_documents: (order.documents || []).map((document, index) => ({
          index,
          documentType: document.documentType,
          fileName: document.fileName,
          uploadedAt: document.uploadedAt,
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
          actual_weight: order.actualWeight,
          volumetric_weight: order.volumetricWeight,
          chargeable_weight: order.chargeableWeight || order.weight,
          no_of_boxes: order.noOfBoxes || 1,
          total_weight: shipment.totalWeight,
          length: order.length,
          breadth: order.breadth,
          height: order.height,
        },

        created_at: toISTDateTime(shipment.createdAt),
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