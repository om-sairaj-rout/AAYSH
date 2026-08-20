// const cron = require("node-cron");
// const Shipping = require("../models/upload/shipping.model");
// const {
//   startOfTodayIST,
//   startOfTomorrowIST,
// } = require("../utils/dateTime");

// // Every 5 minutes from 6:00 PM to 11:55 PM IST
// cron.schedule(
//   "*/5 18-23 * * *",
//   async () => {
//     try {
//       const today = startOfTodayIST();
//       const tomorrow = startOfTomorrowIST();

//       const result = await Shipping.updateMany(
//         {
//           pickupStatus: "Scheduled",
//           pickedUpAt: null,
//           pickupDate: {
//             $gte: today,
//             $lt: tomorrow,
//           },
//         },
//         {
//           $set: {
//             pickupStatus: "Failed",
//             failureReason: "Pickup was not completed before 6:00 PM.",
//           },
//         }
//       );
//     } catch (err) {
//       console.error("[Pickup Cron]", err);
//     }
//   },
//   {
//     timezone: "Asia/Kolkata",
//   }
// );