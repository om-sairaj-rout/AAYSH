const formatAddressLine = (parts) =>
  parts.filter(Boolean).join(", ");

export const formatPartyFullAddress = (party = {}) => {
  const structured = formatAddressLine([
    party.address,
    party.city,
    party.state,
    party.pincode,
  ]);
  if (structured) return structured;
  return party.location || "";
};

export const getReversePickupOrderParties = (order) => {
  if (!order?.isReversePickup) return null;

  const pickup = order.reversePickup?.pickup;
  const delivery = order.reversePickup?.delivery;

  if (pickup?.name || delivery?.name) {
    return {
      pickup: {
        title: "Consignor (Sender)",
        subtitle: "Pickup Details",
        name: pickup?.name || "N/A",
        phone: pickup?.phone || "",
        email: pickup?.email || "",
        address: formatAddressLine([pickup?.address, pickup?.address2]),
        city: pickup?.city || "",
        state: pickup?.state || "",
        pincode: pickup?.pincode || "",
        location:
          order.shipping?.pickupLocation ||
          formatAddressLine([
            pickup?.address,
            pickup?.address2,
            pickup?.city,
            pickup?.state,
            pickup?.pincode,
          ]),
      },
      delivery: {
        title: "Consignee (Receiver)",
        subtitle: "Delivery Details",
        name: delivery?.name || "N/A",
        phone: delivery?.phone || "",
        email: "",
        address: delivery?.address || "",
        city: delivery?.city || "",
        state: delivery?.state || "",
        pincode: delivery?.pincode || "",
      },
    };
  }

  // Fallback when reverse pickup summary is unavailable — order fields follow
  // reversePickupOrder.js (consignor = pickup/sender, consignee = delivery/receiver).
  return {
    pickup: {
      title: "Consignor (Sender)",
      subtitle: "Pickup Details",
      name: order.consignorName || "N/A",
      phone: order.consignorPhone || "",
      email: order.consigneeEmail || "",
      address: "",
      city: "",
      state: "",
      pincode: order.pickupPincode || "",
      location: order.shipping?.pickupLocation || "",
    },
    delivery: {
      title: "Consignee (Receiver)",
      subtitle: "Delivery Details",
      name:
        `${order.consigneeName || ""} ${order.consigneeLastName || ""}`.trim() ||
        "N/A",
      phone: order.billingPhone || "",
      email: "",
      address: formatAddressLine([order.address, order.address2]),
      city: order.destinationCity || "",
      state: order.destinationState || "",
      pincode: order.destinationPincode || "",
    },
  };
};

export const getOrderPartySections = (order) => {
  const reversePickupParties = getReversePickupOrderParties(order);

  if (reversePickupParties) {
    return reversePickupParties;
  }

  return {
    pickup: {
      title: "Consignor (Sender)",
      subtitle: null,
      name: order.consignorName || "N/A",
      phone: order.consignorPhone || "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      location: order.shipping?.pickupLocation || "Default Warehouse",
    },
    delivery: {
      title: "Consignee (Receiver)",
      subtitle: null,
      name:
        `${order.consigneeName || ""} ${order.consigneeLastName || ""}`.trim() ||
        "N/A",
      phone: order.billingPhone || order.contactNo || "",
      email: order.consigneeEmail || "",
      address: formatAddressLine([order.address, order.address2]),
      city: order.destinationCity || "",
      state: order.destinationState || "",
      pincode: order.destinationPincode || "",
    },
  };
};
