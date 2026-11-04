require("../config/loadEnv").loadEnv();
const mongoose = require("mongoose");
const Shipping = require("../models/upload/shipping.model");
const User = require("../models/user.model");
const getExternalShipments = require("../controllers/shipmentControllers/getExternalShipments.controllers");
const getExternalShipmentById = require("../controllers/shipmentControllers/getExternalShipmentById.controllers");

const mockRes = () => {
  const state = { statusCode: 200, body: null };
  return {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(body) {
      state.body = body;
      return this;
    },
    getState: () => state,
  };
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

  const fiberiseUser = await User.findOne({ companyID: "AAYSH-000003" })
    .select("_id companyID role")
    .lean();
  if (!fiberiseUser) {
    throw new Error("No Fiberise user found for test");
  }

  const reqUser = {
    id: String(fiberiseUser._id),
    role: fiberiseUser.role || "user",
    companyID: fiberiseUser.companyID,
  };

  const listRes = mockRes();
  await getExternalShipments(
    { user: reqUser, query: { page: 1, per_page: 5, sort: "DESC" } },
    listRes
  );
  const listState = listRes.getState();
  console.log("LIST status:", listState.statusCode);
  console.log(
    "LIST pagination:",
    listState.body?.meta?.pagination,
    "rows:",
    listState.body?.data?.length
  );

  const sample = await Shipping.findOne({})
    .sort({ createdAt: -1 })
    .select("shipmentId")
    .lean();
  const fiberiseShipping = await Shipping.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "orderId",
        foreignField: "_id",
        as: "order",
      },
    },
    { $unwind: "$order" },
    { $match: { "order.companyID": "AAYSH-000003" } },
    { $limit: 1 },
    { $project: { shipmentId: 1 } },
  ]);

  const shipmentId = fiberiseShipping[0]?.shipmentId || sample?.shipmentId;
  if (shipmentId) {
    const detailRes = mockRes();
    await getExternalShipmentById(
      { user: reqUser, params: { shipmentId } },
      detailRes
    );
    const detailState = detailRes.getState();
    console.log("DETAIL status:", detailState.statusCode, "id:", shipmentId);
    console.log(
      "DETAIL keys:",
      detailState.body?.data ? Object.keys(detailState.body.data) : detailState.body
    );

    const foreignRes = mockRes();
    await getExternalShipmentById(
      {
        user: { id: reqUser.id, role: "user", companyID: "TEST-ORDER-ID-A" },
        params: { shipmentId },
      },
      foreignRes
    );
    console.log(
      "FOREIGN company access:",
      foreignRes.getState().statusCode,
      foreignRes.getState().body?.message
    );
  }

  const missingRes = mockRes();
  await getExternalShipmentById(
    { user: reqUser, params: { shipmentId: "00000000000" } },
    missingRes
  );
  console.log("MISSING id:", missingRes.getState().statusCode);

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
