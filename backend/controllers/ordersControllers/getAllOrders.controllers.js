const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");

const getAllOrders = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    const {
      page = 1,
      per_page = 25,
      sort = "DESC",
      sort_by = "createdAt",
      from,
      to,
      search,
      filter_by,
      filter,
      pickup_location,
    } = req.query;

    const orderFilter = {};

    if (!isAdmin) {
      orderFilter.uploadedBy = req.user.id;
    }

    // =========================
    // DATE FILTER
    // =========================
    if (from || to) {
      orderFilter.orderDate = {};

      if (from) {
        orderFilter.orderDate.$gte = new Date(from);
      }

      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        orderFilter.orderDate.$lte = end;
      }
    }

    // =========================
    // SEARCH
    // Searches Order ID
    // =========================
    if (search) {
      orderFilter.externalOrderId = {
        $regex: search,
        $options: "i",
      };
    }

    // =========================
    // FILTERS ON ORDER MODEL
    // =========================
    if (filter_by && filter) {
      switch (filter_by) {
        case "payment_method":
          orderFilter.paymentMethod = filter;
          break;

        case "channel_order_id":
          orderFilter.externalOrderId = {
            $regex: filter,
            $options: "i",
          };
          break;

        case "delivery_country":
          orderFilter.destinationCountry = filter;
          break;
      }
    }

    const sortOrder = sort.toUpperCase() === "ASC" ? 1 : -1;

    const allowedSortFields = {
      id: "externalOrderId",
      created_at: "createdAt",
      order_date: "orderDate",
      pickup_date: "pickupDate",
    };

    const sortField =
      allowedSortFields[sort_by] || "createdAt";

    const total = await Order.countDocuments(orderFilter);

    const orders = await Order.find(orderFilter)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * per_page)
      .limit(Number(per_page))
      .lean();

    const data = [];

    for (const order of orders) {
      const shipping = await Shipping.findOne({
        orderId: order._id,
      }).lean();

      // =========================
      // SHIPPING FILTERS
      // =========================
      if (pickup_location) {
        if (
          shipping?.pickupLocation !== pickup_location
        ) {
          continue;
        }
      }

      if (
        filter_by === "status" &&
        filter &&
        shipping?.shippingStatus !== filter
      ) {
        continue;
      }

      data.push({
        order_id: order.externalOrderId,

        customer: {
          name: `${order.consigneeName} ${order.consigneeLastName}`.trim(),
          email: order.consigneeEmail,
          phone: order.billingPhone,
          alternate_phone:
            order.billingAlternatePhone,
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

        order_date: order.orderDate,

        pickup_date: order.pickupDate,

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
          pickup_location:
            shipping?.pickupLocation || "",
          status:
            shipping?.shippingStatus || "Pending",
          shipping_charges:
            shipping?.shippingCharges || 0,
          delivery_attempts:
            shipping?.deliveryAttempts || 0,
          attempt_failure_reason:
            shipping?.attemptFailureReason || "",
        },

        created_at: order.createdAt,
      });
    }

    return res.status(200).json({
      success: true,
      data,
      meta: {
        pagination: {
          total,
          count: data.length,
          per_page: Number(per_page),
          current_page: Number(page),
          total_pages: Math.ceil(
            total / Number(per_page)
          ),
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

module.exports = getAllOrders;