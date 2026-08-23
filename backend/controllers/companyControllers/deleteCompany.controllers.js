const mongoose = require("mongoose");
const Company = require("../../models/company.model");
const User = require("../../models/user.model");
const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Tracking = require("../../models/upload/tracking.model");
const UploadHistory = require("../../models/upload/uploadHistory.model");
const Product = require("../../models/product.model");
const Ticket = require("../../models/ticket.model");
const ReversePickup = require("../../models/reversePickup.model");
const OrderIdCounter = require("../../models/orderIdCounter.model");
const Awb = require("../../models/awb/awb.model");

const deleteCompany = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const companyID = String(req.params.companyID || "")
      .trim()
      .toUpperCase();

    if (!companyID) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const company = await Company.findOne({ companyID }).session(session);
    if (!company) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const users = await User.find({ companyID }).select("_id").session(session);
    const userIds = users.map((user) => user._id);

    const reversePickups = await ReversePickup.find({ companyID })
      .select("_id orderId")
      .session(session)
      .lean();
    const reversePickupOrderIds = reversePickups
      .map((item) => item.orderId)
      .filter(Boolean);

    const orders = await Order.find({ companyID }).select("_id").session(session);
    const orderIdSet = new Set([
      ...orders.map((order) => String(order._id)),
      ...reversePickupOrderIds.map((id) => String(id)),
    ]);
    const orderIds = [...orderIdSet].map((id) => new mongoose.Types.ObjectId(id));

    const shippings = orderIds.length
      ? await Shipping.find({ orderId: { $in: orderIds } })
          .select("_id")
          .session(session)
      : [];
    const shippingIds = shippings.map((item) => item._id);

    if (shippingIds.length) {
      await Tracking.deleteMany({ shippingId: { $in: shippingIds } }).session(
        session
      );
    }

    if (orderIds.length) {
      await Shipping.deleteMany({ orderId: { $in: orderIds } }).session(session);
      await Awb.updateMany(
        { assignedOrder: { $in: orderIds } },
        { $set: { status: "available", assignedOrder: null } }
      ).session(session);
      await Order.deleteMany({ _id: { $in: orderIds } }).session(session);
    }

    await UploadHistory.deleteMany({ companyID }).session(session);
    await Product.deleteMany({ companyID }).session(session);
    await Ticket.deleteMany({ companyID }).session(session);
    await ReversePickup.deleteMany({ companyID }).session(session);
    await OrderIdCounter.deleteMany({
      $or: [{ _id: companyID }, { companyID }],
    }).session(session);

    if (userIds.length) {
      await User.deleteMany({ _id: { $in: userIds } }).session(session);
    }

    await Company.deleteOne({ companyID }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Company ${companyID} and related data deleted`,
      deleted: {
        companyID,
        users: userIds.length,
        orders: orderIds.length,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Delete company error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete company",
    });
  }
};

module.exports = deleteCompany;
