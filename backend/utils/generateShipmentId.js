const Shipping = require("../models/upload/shipping.model");

const generateId = () =>
  Math.floor(10000000 + Math.random() * 90000000).toString();

const generateUniqueShipmentId = async () => {
  let id;
  while (true) {
    id = generateId();
    const exists = await Shipping.exists({ shipmentId: id });
    if (!exists) return id;
  }
};

/**
 * Backfill shipmentId on legacy shipping rows that were saved without one.
 * Mongoose re-validates required fields on save(), so missing shipmentId
 * causes updates to fail even when shipmentId is not part of the update payload.
 */
const ensureShippingHasShipmentId = async (shippingDoc) => {
  const existing = String(shippingDoc?.shipmentId || "").trim();
  if (existing) return existing;

  const shipmentId = await generateUniqueShipmentId();
  shippingDoc.shipmentId = shipmentId;
  return shipmentId;
};

module.exports = {
  generateUniqueShipmentId,
  ensureShippingHasShipmentId,
};
