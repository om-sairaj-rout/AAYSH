const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const { userOwnsOrder } = require("../../utils/companyScope");
const { applyOrderWalletFieldUpdate } = require("../../utils/orderWalletUpdate");

const updateOrderWalletFields = async (req, res) => {
  try {
    const {
      order_id,
      weight,
      length,
      breadth,
      height,
      oda_charge,
      service_type,
    } = req.body;

    const externalOrderId = String(order_id || "").trim();
    if (!externalOrderId) {
      return res.status(400).json({
        success: false,
        message: "order_id is required.",
      });
    }

    const order = await Order.findOne({ externalOrderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (!userOwnsOrder(order, req)) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const shipping = await Shipping.findOne({ orderId: order._id });
    const isAdmin = req.user?.role === "admin";
    const shippingStatus = shipping?.shippingStatus || "Pending";

    if (!isAdmin && !["Pending", "Booked"].includes(shippingStatus)) {
      return res.status(400).json({
        success: false,
        message: "Order can no longer be updated in this status.",
      });
    }

    const walletResult = await applyOrderWalletFieldUpdate({
      order,
      shipping,
      weight,
      length,
      breadth,
      height,
      odaCharge: oda_charge,
      serviceType: service_type,
      createdBy: req.user?.id,
    });

    if (!walletResult.success) {
      return res.status(400).json({
        success: false,
        message: walletResult.message || "Unable to update order wallet fields.",
      });
    }

    await order.save();
    if (shipping) {
      await shipping.save();
    }

    return res.status(200).json({
      success: true,
      message: "Order shipment details updated.",
      data: {
        order_id: order.externalOrderId,
        walletChargeAmount: order.walletChargeAmount,
        chargeableWeight: order.chargeableWeight,
        odaCharge: order.odaCharge,
        serviceType: shipping?.serviceType || null,
        additionalDebit: walletResult.additionalDebit || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update order.",
    });
  }
};

module.exports = updateOrderWalletFields;
