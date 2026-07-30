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

  search,

  status,
  payment_method,
  pickup_location,
  courier_name,

  from,
  to,
} = req.query;
console.log("status =", status);

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
// External Order ID, AWB, Customer Name, Phone
// =========================
if (search) {
  const shippingOrders = await Shipping.find({
    awbNumber: {
      $regex: search,
      $options: "i",
    },
  }).select("orderId");

  orderFilter.$or = [
    {
      externalOrderId: {
        $regex: search,
        $options: "i",
      },
    },
    {
      consigneeName: {
        $regex: search,
        $options: "i",
      },
    },
    {
      consigneeLastName: {
        $regex: search,
        $options: "i",
      },
    },
    {
      billingPhone: {
        $regex: search,
        $options: "i",
      },
    },
    {
      _id: {
        $in: shippingOrders.map((x) => x.orderId),
      },
    },
  ];
}

// =========================
// PAYMENT FILTER
// =========================
if (payment_method) {
  orderFilter.paymentMethod = payment_method;
}

    const sortOrder = sort.toUpperCase() === "ASC" ? 1 : -1;

    const allowedSortFields = {
  createdAt: "createdAt",
  orderDate: "orderDate",
  pickupDate: "pickupDate",
  invoiceValue: "invoiceValue",
};

    const sortField =
      allowedSortFields[sort_by] || "createdAt";


    let ordersQuery = Order.find(orderFilter)
  .sort({ [sortField]: sortOrder });

const allOrders = await ordersQuery.lean();

const filteredOrders = [];

for (const order of allOrders) {
  const shipping = await Shipping.findOne({
    orderId: order._id,
  }).lean();


  if (
    status &&
    shipping?.shippingStatus !== status
  ) {
    continue;
  }


  if (
    pickup_location &&
    shipping?.pickupLocation !== pickup_location
  ) {
    continue;
  }


  if (
    courier_name &&
    shipping?.courierName?.toLowerCase() !==
      courier_name.toLowerCase()
  ) {
    continue;
  }


  filteredOrders.push({
    order,
    shipping
  });
}


const total = filteredOrders.length;


const orders = filteredOrders
  .slice(
    (page - 1) * per_page,
    page * per_page
  );

    const data = [];

    for (const item of orders) {

const order = item.order;
const shipping = item.shipping;

      // =========================
      // SHIPPING FILTERS
      // =========================
  if (
  status &&
  shipping?.shippingStatus !== status
) {
  continue;
}

if (
  pickup_location &&
  shipping?.pickupLocation !== pickup_location
) {
  continue;
}

if (
  courier_name &&
  shipping?.courierName.toLowerCase() !==
    courier_name.toLowerCase()
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