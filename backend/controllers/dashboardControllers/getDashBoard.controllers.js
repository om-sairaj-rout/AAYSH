const Order = require(
  "../../models/upload/order.model"
);

const getDashboardController = async (
  req,
  res
) => {

  try {

    const isAdmin =
      req.user.role === "admin";

    const selectedYear =
      req.query.year;

    let filter = {};

    if (!isAdmin) {
      filter.uploadedBy =
        req.user.id;
    }

    let orders =
      await Order.find(filter);

    // YEAR FILTER
    if (selectedYear) {

      orders = orders.filter(
        (order) => {

          if (!order.pickupDate)
            return false;

          return (
            new Date(order.pickupDate)
              .getFullYear()
              .toString() ===
            selectedYear
          );
        }
      );
    }

    // STATS

    const totalOrders =
      orders.length;

    const deliveredOrders =
      orders.filter(
        (o) =>
          (
            o.courierStatus || ""
          ).toLowerCase() ===
          "delivered"
      ).length;

    const inTransitOrders =
      orders.filter((o) => {

        const status =
          (
            o.courierStatus || ""
          ).toLowerCase();

        return (
          status ===
            "in transit" ||
          status ===
            "shipped"
        );
      }).length;

    const delayedOrders =
      orders.filter((o) => {

        const status =
          (
            o.courierStatus || ""
          ).toLowerCase();

        return (
          status ===
            "delayed"
        );
      }).length;

    const totalCost =
      orders.reduce(
        (acc, curr) =>
          acc +
          Number(
            curr.invoiceValue || 0
          ),
        0
      );

    // CHART DATA

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const chartData =
      months.map(
        (month, index) => {

          const monthOrders =
            orders.filter(
              (o) =>
                o.pickupDate &&
                new Date(
                  o.pickupDate
                ).getMonth() ===
                  index
            );

          return {
            name: month,
            orders:
              monthOrders.length,
            cost:
              monthOrders.reduce(
                (
                  acc,
                  curr
                ) =>
                  acc +
                  Number(
                    curr.invoiceValue ||
                    0
                  ),
                0
              ),
          };
        }
      );

    // TOP CITIES

    const cityMap = {};

    orders.forEach((o) => {

      const city =
        o.destinationCity ||
        "Unknown";

      if (!cityMap[city]) {

        cityMap[city] = {
          city,
          orders: 0,
          cost: 0,
        };
      }

      cityMap[
        city
      ].orders += 1;

      cityMap[
        city
      ].cost += Number(
        o.invoiceValue || 0
      );
    });

    const topCities =
      Object.values(cityMap)

        .sort(
          (a, b) =>
            b.orders -
            a.orders
        )

        .slice(0, 20);

    return res.status(200).json({
      success: true,

      stats: {
        totalOrders,
        deliveredOrders,
        inTransitOrders,
        delayedOrders,
      },

      chartData,

      topCities,

      totalCost,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

module.exports =
  getDashboardController;