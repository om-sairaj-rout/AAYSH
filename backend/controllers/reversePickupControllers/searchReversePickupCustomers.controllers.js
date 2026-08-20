const Order = require("../../models/upload/order.model");
const ReversePickup = require("../../models/reversePickup.model");
const { buildOrderScopeForUser } = require("../../utils/companyScope");

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildConsigneeFullName = (order) =>
  `${order.consigneeName || ""} ${order.consigneeLastName || ""}`
    .trim()
    .replace(/\s+/g, " ");

const buildReversePickupScope = (user) => {
  if (user?.companyID) {
    return { companyID: user.companyID };
  }

  if (user?.id) {
    return { requestedBy: user.id };
  }

  return {};
};

const mapForwardOrderCustomer = (order) => {
  const name = buildConsigneeFullName(order);
  if (!name) return null;

  return {
    id: `order-${order._id}`,
    name,
    phone: String(order.billingPhone || "").trim(),
    email: order.consigneeEmail || "",
    address: order.address || "",
    address2: order.address2 || "",
    city: order.destinationCity || "",
    state: order.destinationState || "",
    pincode: order.destinationPincode || "",
    country: order.destinationCountry || "India",
  };
};

const mapReversePickupRequestCustomer = (request) => {
  const name = String(request.fromName || "").trim().replace(/\s+/g, " ");
  if (!name) return null;

  return {
    id: `rp-${request._id}`,
    name,
    phone: String(request.fromPhone || "").trim(),
    email: request.fromEmail || "",
    address: request.fromAddress || "",
    address2: request.fromAddress2 || "",
    city: request.fromCity || "",
    state: request.fromState || "",
    pincode: request.fromPincode || "",
    country: request.fromCountry || "India",
  };
};

const searchReversePickupCustomers = async (req, res) => {
  try {
    const query = String(req.query.q || req.query.search || "").trim();

    if (query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Enter at least 2 characters to search by customer name",
      });
    }

    const orderScope = buildOrderScopeForUser(req.user);
    const reversePickupScope = buildReversePickupScope(req.user);
    const namePattern = escapeRegex(query);
    const nameRegex = { $regex: namePattern, $options: "i" };

    const [forwardOrders, reversePickupRequests] = await Promise.all([
      Order.find({
        ...orderScope,
        isReversePickup: { $ne: true },
        $expr: {
          $regexMatch: {
            input: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$consigneeName", ""] },
                    " ",
                    { $ifNull: ["$consigneeLastName", ""] },
                  ],
                },
              },
            },
            regex: namePattern,
            options: "i",
          },
        },
      })
        .select(
          "consigneeName consigneeLastName billingPhone consigneeEmail address address2 destinationCity destinationState destinationPincode destinationCountry"
        )
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      ReversePickup.find({
        ...reversePickupScope,
        fromName: nameRegex,
      })
        .select(
          "fromName fromPhone fromEmail fromAddress fromAddress2 fromCity fromState fromPincode fromCountry createdAt"
        )
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    const customers = [
      ...forwardOrders.map(mapForwardOrderCustomer).filter(Boolean),
      ...reversePickupRequests.map(mapReversePickupRequestCustomer).filter(Boolean),
    ]
      .sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        });
        if (nameCompare !== 0) return nameCompare;
        return String(a.phone).localeCompare(String(b.phone));
      })
      .slice(0, 30);

    return res.status(200).json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to search customers",
    });
  }
};

module.exports = searchReversePickupCustomers;
