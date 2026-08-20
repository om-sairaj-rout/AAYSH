const formatAddressLine = (parts) =>
  parts.filter(Boolean).join(", ");

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

  // Legacy orders created before mapping fix (consignor/consignee were swapped).
  return {
    pickup: {
      title: "Consignor (Sender)",
      subtitle: "Pickup Details",
      name:
        `${order.consigneeName || ""} ${order.consigneeLastName || ""}`.trim() ||
        "N/A",
      phone: order.billingPhone || "",
      email: order.consigneeEmail || "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      location: order.shipping?.pickupLocation || "",
    },
    delivery: {
      title: "Consignee (Receiver)",
      subtitle: "Delivery Details",
      name: order.consignorName || "N/A",
      phone: order.consignorPhone || "",
      email: "",
      address: order.address || "",
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
