const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const USER_ID = process.argv[2] || "6a840c8bf54258df3cd21a5f";

const User = require("../models/user.model");
const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Tracking = require("../models/upload/tracking.model");
const UploadHistory = require("../models/upload/uploadHistory.model");
const Product = require("../models/product.model");
const Ticket = require("../models/ticket.model");
const ReversePickup = require("../models/reversePickup.model");
const Company = require("../models/company.model");
const Awb = require("../models/awb/awb.model");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const userObjectId = new mongoose.Types.ObjectId(USER_ID);

  const user = await User.findById(userObjectId).lean();
  if (!user) {
    console.log(JSON.stringify({ error: "User not found", userId: USER_ID }, null, 2));
    await mongoose.disconnect();
    process.exit(1);
  }

  const orders = await Order.find({ uploadedBy: userObjectId })
    .select("_id externalOrderId companyID createdAt")
    .lean();
  const orderIds = orders.map((o) => o._id);

  const shippings = orderIds.length
    ? await Shipping.find({ orderId: { $in: orderIds } })
        .select("_id orderId shipmentId awbNumber shippingStatus")
        .lean()
    : [];
  const shippingIds = shippings.map((s) => s._id);

  const tracking = shippingIds.length
    ? await Tracking.find({ shippingId: { $in: shippingIds } })
        .select("_id shippingId status eventTime")
        .lean()
    : [];

  const trackingUpdatedByUser = await Tracking.find({ updatedBy: userObjectId })
    .select("_id shippingId status updatedBy")
    .lean();

  const uploadHistories = await UploadHistory.find({ uploadedBy: userObjectId })
    .select("_id fileName companyID totalRows uploadDate")
    .lean();

  const products = await Product.find({ createdBy: userObjectId })
    .select("_id name sku companyID")
    .lean();

  const ticketsSubmitted = await Ticket.find({ submittedBy: userObjectId })
    .select("_id subject status createdAt")
    .lean();

  const ticketsAssigned = await Ticket.find({ assignedTo: userObjectId })
    .select("_id subject status createdAt")
    .lean();

  const reversePickupsRequested = await ReversePickup.find({
    requestedBy: userObjectId,
  })
    .select("_id orderId status createdAt")
    .lean();

  const reversePickupsReviewed = await ReversePickup.find({
    reviewedBy: userObjectId,
  })
    .select("_id orderId status createdAt")
    .lean();

  const ownedCompanies = await Company.find({ ownerId: userObjectId })
    .select("_id companyID companyName")
    .lean();

  const awbsOnUserOrders = orderIds.length
    ? await Awb.find({ assignedOrder: { $in: orderIds } })
        .select("_id awbNumber status assignedOrder")
        .lean()
    : [];

  const otherUsersSameCompany = user.companyID
    ? await User.countDocuments({
        companyID: user.companyID,
        _id: { $ne: userObjectId },
      })
    : 0;

  const ordersSameCompanyOtherUploader = user.companyID
    ? await Order.countDocuments({
        companyID: user.companyID,
        uploadedBy: { $ne: userObjectId },
      })
    : 0;

  const report = {
    userId: USER_ID,
    userAccount: {
      willDelete: false,
      email: user.email,
      fullName: user.fullName,
      companyID: user.companyID,
      companyName: user.companyName,
      role: user.role,
      companyRole: user.companyRole,
    },
    relatedUsersOnSameCompany: otherUsersSameCompany,
    ordersSameCompanyFromOtherUsers: ordersSameCompanyOtherUploader,
    collections: {
      orders: {
        count: orders.length,
        sample: orders.slice(0, 5),
        deleteSafe: true,
        note: "Only orders where uploadedBy = this user",
      },
      shippings: {
        count: shippings.length,
        sample: shippings.slice(0, 5),
        deleteSafe: true,
        note: "Shipments linked to this user's orders only",
      },
      trackings: {
        count: tracking.length,
        linkedToUserShipments: tracking.length,
        updatedByUserOnly: trackingUpdatedByUser.filter(
          (t) => !shippingIds.some((id) => String(id) === String(t.shippingId))
        ).length,
        sample: tracking.slice(0, 5),
        deleteSafe: true,
        note: "Tracking events for this user's shipments",
      },
      uploadhistories: {
        count: uploadHistories.length,
        sample: uploadHistories.slice(0, 5),
        deleteSafe: true,
        note: "Upload history where uploadedBy = this user",
      },
      products: {
        count: products.length,
        sample: products.slice(0, 5),
        deleteSafe: true,
        note: "Products where createdBy = this user",
      },
      tickets_submitted: {
        count: ticketsSubmitted.length,
        sample: ticketsSubmitted.slice(0, 5),
        deleteSafe: true,
        note: "Tickets submitted by this user",
      },
      tickets_assigned: {
        count: ticketsAssigned.length,
        sample: ticketsAssigned.slice(0, 5),
        deleteSafe: false,
        note: "Assigned TO this user — deleting would affect ticket assignment, not ownership",
      },
      reversepickups_requested: {
        count: reversePickupsRequested.length,
        sample: reversePickupsRequested.slice(0, 5),
        deleteSafe: true,
        note: "Reverse pickups requested by this user",
      },
      reversepickups_reviewed: {
        count: reversePickupsReviewed.length,
        sample: reversePickupsReviewed.slice(0, 5),
        deleteSafe: false,
        note: "Reviewed BY this user — reference only, not user-owned data",
      },
      companies_owned: {
        count: ownedCompanies.length,
        sample: ownedCompanies,
        deleteSafe: false,
        note: "Companies where ownerId = this user — would affect entire company",
      },
      awbs_assigned_to_user_orders: {
        count: awbsOnUserOrders.length,
        sample: awbsOnUserOrders.slice(0, 5),
        deleteSafe: "reset",
        note: "AWBs booked to this user's orders — should reset to available, not delete AWB pool entries",
      },
    },
    recommendedDeletionOrder: [
      "trackings (for user's shipments)",
      "shippings (for user's orders)",
      "awbs reset assignedOrder + status=available",
      "orders",
      "uploadhistories",
      "products",
      "tickets (submitted only)",
      "reversepickups (requested only)",
    ],
    excludedByDefault: [
      "users (account preserved)",
      "companies",
      "tickets where user is assignee only",
      "reversepickups where user is reviewer only",
      "orders/shippings belonging to other users on same company",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
