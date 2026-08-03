const cron = require("node-cron");
const Pickup = require("../models/pickup.model");

// Runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    // Today's start
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tomorrow's start
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today 6 PM
    const sixPM = new Date(today);
    sixPM.setHours(18, 0, 0, 0);

    // Before 6 PM, do nothing
    if (now < sixPM) return;

    const result = await Pickup.updateMany(
      {
        pickupStatus: "Scheduled",
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