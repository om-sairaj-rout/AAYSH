const cron = require("node-cron");
const Shipping = require("../models/upload/shipping.model");

// Every 5 minutes from 6:00 PM to 11:55 PM
cron.schedule("*/5 18-23 * * *", async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await Shipping.updateMany(
      {
        pickupStatus: "Scheduled",
        pickedUpAt: null,
        pickupDate: {
          $gte: today,
          $lt: tomorrow,
        },
      },
      {
        $set: {
          pickupStatus: "Failed",
          failureReason: "Pickup was not completed before 6:00 PM.",
        },
      }
    );

    console.log(
      `[Pickup Cron] ${result.modifiedCount} pickup(s) marked as Failed.`
    );
  } catch (err) {
    console.error("[Pickup Cron]", err);
  }
});