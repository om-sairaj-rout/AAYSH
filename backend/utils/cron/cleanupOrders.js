const cron = require("node-cron");
const Order = require("../../models/upload/order.model");

// runs every day at 12:00 AM
cron.schedule("0 0 * * *", async () => {
  try {
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    const result = await Order.deleteMany({
      createdAt: { $lt: fourMonthsAgo },
      courierStatus: "Delivered",
    });

    console.log(
      `Deleted ${result.deletedCount} old completed orders`
    );
  } catch (error) {
    console.error("Cleanup error:", error);
  }
});