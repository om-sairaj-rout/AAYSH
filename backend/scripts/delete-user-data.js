const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const USER_ID = process.argv[2];
if (!USER_ID) {
  console.error("Usage: node scripts/delete-user-data.js <userId>");
  process.exit(1);
}

const User = require("../models/user.model");
const Company = require("../models/company.model");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Tracking = require("../models/upload/tracking.model");
const UploadHistory = require("../models/upload/uploadHistory.model");
const Product = require("../models/product.model");
const Ticket = require("../models/ticket.model");
const ReversePickup = require("../models/reversePickup.model");
const OrderIdCounter = require("../models/orderIdCounter.model");
const Awb = require("../models/awb/awb.model");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const userObjectId = new mongoose.Types.ObjectId(USER_ID);

  const user = await User.findById(userObjectId).lean();
  if (!user) {
    throw new Error(`User not found: ${USER_ID}`);
  }

  const companyID = String(user.companyID || "").trim().toUpperCase();
  if (!companyID) {
    throw new Error("User has no companyID");
  }

  const company = await Company.findOne({ companyID }).lean();
  if (!company) {
    throw new Error(`Company not found: ${companyID}`);
  }

  const reversePickups = await ReversePickup.find({ companyID }).lean();
  const reversePickupOrderIds = reversePickups
    .map((item) => item.orderId)
    .filter(Boolean);

  const orders = await Order.find({ companyID }).lean();
  const orderIdSet = new Set([
    ...orders.map((o) => String(o._id)),
    ...reversePickupOrderIds.map((id) => String(id)),
  ]);
  const orderIds = [...orderIdSet].map((id) => new mongoose.Types.ObjectId(id));

  const shippings = orderIds.length
    ? await Shipping.find({ orderId: { $in: orderIds } }).lean()
    : [];
  const shippingIds = shippings.map((s) => s._id);

  const before = {
    userId: USER_ID,
    userEmail: user.email,
    companyID,
    companyName: company.companyName,
    orders: orderIds.length,
    shippings: shippings.length,
    trackings: shippingIds.length
      ? await Tracking.countDocuments({ shippingId: { $in: shippingIds } })
      : 0,
    uploadHistories: await UploadHistory.countDocuments({ companyID }),
    products: await Product.countDocuments({ companyID }),
    tickets: await Ticket.countDocuments({ companyID }),
    reversePickups: reversePickups.length,
    orderIdCounters: await OrderIdCounter.countDocuments({ companyID }),
    awbsToReset: orderIds.length
      ? await Awb.countDocuments({ assignedOrder: { $in: orderIds } })
      : 0,
    companies: 1,
  };

  console.log("BEFORE DELETE:", JSON.stringify(before, null, 2));

  const trackingResult = shippingIds.length
    ? await Tracking.deleteMany({ shippingId: { $in: shippingIds } })
    : { deletedCount: 0 };

  const shippingResult = orderIds.length
    ? await Shipping.deleteMany({ orderId: { $in: orderIds } })
    : { deletedCount: 0 };

  const awbResult = orderIds.length
    ? await Awb.updateMany(
        { assignedOrder: { $in: orderIds } },
        { $set: { status: "available", assignedOrder: null } }
      )
    : { modifiedCount: 0 };

  const orderResult = orderIds.length
    ? await Order.deleteMany({ _id: { $in: orderIds } })
    : { deletedCount: 0 };

  const uploadHistoryResult = await UploadHistory.deleteMany({ companyID });
  const productResult = await Product.deleteMany({ companyID });
  const ticketResult = await Ticket.deleteMany({ companyID });
  const reversePickupResult = await ReversePickup.deleteMany({ companyID });
  const orderIdCounterResult = await OrderIdCounter.deleteMany({ companyID });
  const companyResult = await Company.deleteOne({ companyID });

  await User.updateOne({ _id: userObjectId }, { $set: { companyID: "" } });

  const after = {
    ordersRemainingForCompany: await Order.countDocuments({ companyID }),
    ordersRemainingForUser: await Order.countDocuments({
      uploadedBy: userObjectId,
    }),
    uploadHistoriesRemaining: await UploadHistory.countDocuments({ companyID }),
    companyRemaining: await Company.countDocuments({ companyID }),
    userAccountRemaining: await User.countDocuments({ _id: userObjectId }),
    userCompanyIdAfterCleanup: (
      await User.findById(userObjectId).select("companyID email").lean()
    )?.companyID,
  };

  const summary = {
    deleted: {
      trackings: trackingResult.deletedCount || 0,
      shippings: shippingResult.deletedCount || 0,
      awbsReset: awbResult.modifiedCount || 0,
      orders: orderResult.deletedCount || 0,
      uploadHistories: uploadHistoryResult.deletedCount || 0,
      products: productResult.deletedCount || 0,
      tickets: ticketResult.deletedCount || 0,
      reversePickups: reversePickupResult.deletedCount || 0,
      orderIdCounters: orderIdCounterResult.deletedCount || 0,
      companies: companyResult.deletedCount || 0,
    },
    preserved: {
      userAccount: true,
      userId: USER_ID,
    },
    userCompanyIdCleared: true,
    after,
  };

  console.log("DELETE COMPLETE:", JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
