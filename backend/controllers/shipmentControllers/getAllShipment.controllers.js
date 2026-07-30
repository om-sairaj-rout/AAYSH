const Shipping = require("../../models/upload/shipping.model");
const Order = require("../../models/upload/order.model");

const getAllShipments = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const {
      page = 1,
      per_page = 25,
      status,
      search,
      sort = "DESC",
      from,
      to,
    } = req.query;

    const orderFilter = {};
    const shippingFilter = {};

    if (!isAdmin) {
      orderFilter.uploadedBy = req.user.id;
    }

    // Shipment Status
    if (status) {
      shippingFilter.shippingStatus = status;
    }

    // Date Filter (Shipment Created Date)
    if (from || to) {
      shippingFilter.createdAt = {};

      if (from) {
        shippingFilter.createdAt.$gte = new Date(from);
      }

      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        shippingFilter.createdAt.$lte = endDate;
      }
    }

    // Search by AWB
    if (search) {
      shippingFilter.awbNumber = {
        $regex: search,
        $options: "i",
      };
    }

    const sortOption = {
      createdAt: sort === "ASC" ? 1 : -1,
    };

    const shipments = await Shipping.find(shippingFilter)
      .sort(sortOption)
      .lean();

    const data = [];

    for (const shipment of shipments) {
      const order = await Order.findOne({
        _id: shipment.orderId,
        ...orderFilter,
      }).lean();

      // Skip shipments belonging to other users
      if (!order) continue;

      // Search by External Order ID
      if (
        search &&
        shipment.awbNumber !== search &&
        !order.externalOrderId
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        continue;
      }

      data.push({
        shipment_id: shipment.shipmentId,

        order_id: order.externalOrderId,

        products: order.orderItems.map((item) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.units,
        })),

        awb: shipment.awbNumber,

        status: shipment.shippingStatus,

        created_at: shipment.createdAt,

        courier: shipment.courierName,

        pickup_location: shipment.pickupLocation,

        payment_method: order.paymentMethod,
      });
    }

    const total = data.length;

    const start = (Number(page) - 1) * Number(per_page);
    const end = start + Number(per_page);

    return res.status(200).json({
      success: true,

      data: data.slice(start, end),

      meta: {
        pagination: {
          total,
          count: data.slice(start, end).length,
          per_page: Number(per_page),
          current_page: Number(page),
          total_pages: Math.ceil(total / Number(per_page)),
        },
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

module.exports = getAllShipments;