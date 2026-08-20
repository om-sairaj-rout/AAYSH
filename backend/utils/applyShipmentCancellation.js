/**
 * Apply consistent cancellation fields on a Shipping document.
 * Keeps pickup schedule in sync when a shipment/order is cancelled.
 */
const applyShipmentCancellation = (shipping) => {
  shipping.shippingStatus = "Cancelled";
  shipping.cancelledAt = new Date();

  if (shipping.pickupStatus !== "Completed") {
    shipping.pickupStatus = "Cancelled";
    shipping.pickupCancelledAt = new Date();
  }
};

module.exports = { applyShipmentCancellation };
